/**
 * Database operations for job queue: claiming, marking, backoff logic.
 * Uses SKIP LOCKED for safe concurrent job claiming.
 */

import { eq, sql } from "drizzle-orm";
import { jobs } from "@/lib/db/schema";
import type { createDb } from "@/lib/db";

export type Job = typeof jobs.$inferSelect;
export type NeonDatabase = ReturnType<typeof createDb>;

/** Raw row from Postgres RETURNING *; driver may return snake_case or camelCase. */
type RawJobRow = Record<string, unknown>;

function rawRowToJob(row: RawJobRow): Job {
  return {
    id: row.id as bigint,
    runId: (row.runId ?? row.run_id) as string,
    type: row.type as Job["type"],
    payload: row.payload as Record<string, unknown>,
    status: row.status as Job["status"],
    priority: Number(row.priority),
    attempts: Number(row.attempts),
    maxAttempts: Number(row.maxAttempts ?? row.max_attempts),
    availableAt: (row.availableAt ?? row.available_at) as Date,
    lockedAt: (row.lockedAt ?? row.locked_at) as Date | null,
    lockedBy: (row.lockedBy ?? row.locked_by) as string | null,
    lastError: (row.lastError ?? row.last_error) as string | null,
    dedupeKey: (row.dedupeKey ?? row.dedupe_key) as string | null,
    result: row.result as Record<string, unknown> | null,
    createdAt: (row.createdAt ?? row.created_at) as Date,
    updatedAt: (row.updatedAt ?? row.updated_at) as Date,
  };
}

const BACKOFF_DELAYS = [
  60, // 1st fail: +1 minute
  300, // 2nd: +5 minutes
  900, // 3rd: +15 minutes
  3600, // 4th: +1 hour
  21600, // 5th+: +6 hours
];

/**
 * Release stale job locks: reset jobs stuck in "running" longer than staleMinutes
 * so they can be re-claimed (status -> retry, available_at = now, clear lock).
 */
export async function releaseStaleJobLocks(
  db: NeonDatabase,
  staleMinutes: number,
): Promise<void> {
  await db.execute(sql`
    UPDATE jobs
    SET status = 'retry',
        available_at = NOW(),
        locked_at = NULL,
        locked_by = NULL,
        updated_at = NOW()
    WHERE status = 'running'
      AND locked_at < NOW() - INTERVAL '1 minute' * ${staleMinutes}
  `);
}

/**
 * Claim a batch of jobs using SKIP LOCKED, with source rotation so no single
 * source dominates (round-robin by source_id for fetch/extract/map jobs).
 */
export async function claimJobs(
  db: NeonDatabase,
  limit: number,
  lockedBy: string,
): Promise<Job[]> {
  const poolSize = Math.max(limit * 3, 75);
  const result = await db.execute(sql`
    WITH locked AS (
      SELECT id, priority, type, payload
      FROM jobs
      WHERE status IN ('pending', 'retry')
        AND available_at <= NOW()
      FOR UPDATE SKIP LOCKED
      LIMIT ${poolSize}
    ),
    job_sources AS (
      SELECT l.id, l.priority,
        CASE l.type
          WHEN 'fetch' THEN (SELECT i.source_id FROM items i WHERE i.id = (l.payload->>'itemId')::uuid LIMIT 1)
          WHEN 'extract' THEN (SELECT i.source_id FROM documents d JOIN items i ON i.id = d.item_id WHERE d.id = (l.payload->>'documentId')::uuid LIMIT 1)
          WHEN 'map' THEN (SELECT i.source_id FROM documents d JOIN items i ON i.id = d.item_id WHERE d.id = (l.payload->>'documentId')::uuid LIMIT 1)
          ELSE NULL
        END AS source_id
      FROM locked l
    ),
    ranked AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY COALESCE(source_id::text, id::text) ORDER BY priority ASC, id ASC) AS rn
      FROM job_sources
    ),
    cte AS (
      SELECT id FROM ranked ORDER BY rn ASC, id ASC LIMIT ${limit}
    )
    UPDATE jobs
    SET status = 'running',
        locked_at = NOW(),
        locked_by = ${lockedBy},
        updated_at = NOW()
    WHERE id IN (SELECT id FROM cte)
    RETURNING *
  `);

  const rows = (result.rows ?? []) as RawJobRow[];
  return rows.map(rawRowToJob);
}

/**
 * Mark a job as done.
 */
export async function markJobDone(
  db: NeonDatabase,
  jobId: bigint,
): Promise<void> {
  await db
    .update(jobs)
    .set({
      status: "done",
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));
}

/**
 * Mark a job as failed with exponential backoff or dead-lettering.
 */
export async function markJobFailed(
  db: NeonDatabase,
  jobId: bigint,
  error: string,
): Promise<void> {
  const jobRows = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (jobRows.length === 0) return;

  const job = jobRows[0];
  const attempts = job.attempts + 1;
  const maxAttempts = job.maxAttempts;

  if (attempts >= maxAttempts) {
    await db
      .update(jobs)
      .set({
        status: "dead",
        attempts,
        lastError: error,
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));
  } else {
    const delaySeconds =
      BACKOFF_DELAYS[Math.min(attempts - 1, BACKOFF_DELAYS.length - 1)];
    const availableAt = new Date(Date.now() + delaySeconds * 1000);

    await db
      .update(jobs)
      .set({
        status: "retry",
        attempts,
        availableAt,
        lastError: error,
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));
  }
}

/**
 * Count ready jobs (pending or retry with available_at <= now).
 */
export async function countReadyJobs(db: NeonDatabase): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM jobs
    WHERE status IN ('pending', 'retry')
      AND available_at <= NOW()
  `);

  return Number(result.rows[0]?.count ?? 0);
}

/**
 * Enqueue a new job (with deduplication check).
 */
export async function enqueueJob(
  db: NeonDatabase,
  job: {
    runId: string;
    type: "discover" | "fetch" | "extract" | "map" | "aggregate";
    payload: Record<string, unknown>;
    dedupeKey?: string;
    priority?: number;
    maxAttempts?: number;
  },
): Promise<void> {
  if (job.dedupeKey) {
    const existing = await db.execute(sql`
      SELECT id FROM jobs
      WHERE run_id = ${job.runId}
        AND type = ${job.type}
        AND dedupe_key = ${job.dedupeKey}
      LIMIT 1
    `);

    if (existing.rows.length > 0) return;
  }

  await db.insert(jobs).values({
    runId: job.runId,
    type: job.type,
    payload: job.payload,
    dedupeKey: job.dedupeKey ?? null,
    priority: job.priority ?? 100,
    maxAttempts: job.maxAttempts ?? 5,
    status: "pending",
  });
}

/**
 * Create a new pipeline run.
 */
export async function createPipelineRun(db: NeonDatabase): Promise<string> {
  const result = await db.execute(sql`
    INSERT INTO pipeline_runs (status)
    VALUES ('running')
    RETURNING id
  `);

  return result.rows[0]?.id as string;
}
