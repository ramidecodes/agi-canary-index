/**
 * Database operations for job queue: claiming, marking, backoff logic.
 * Uses SKIP LOCKED for safe concurrent job claiming.
 */

import { eq, sql } from "drizzle-orm";
import { jobs } from "../../src/lib/db/schema";
import type { createDb } from "../../src/lib/db";

export type Job = typeof jobs.$inferSelect;
export type NeonDatabase = ReturnType<typeof createDb>;

const BACKOFF_DELAYS = [
  60, // 1st fail: +1 minute
  300, // 2nd: +5 minutes
  900, // 3rd: +15 minutes
  3600, // 4th: +1 hour
  21600, // 5th+: +6 hours
];

/**
 * Claim a batch of jobs using SKIP LOCKED for safe concurrent claiming.
 */
export async function claimJobs(
  db: NeonDatabase,
  limit: number,
  lockedBy: string,
): Promise<Job[]> {
  // Use raw SQL for SKIP LOCKED (Drizzle doesn't support it directly)
  const result = await db.execute(sql`
    WITH cte AS (
      SELECT id
      FROM jobs
      WHERE status IN ('pending', 'retry')
        AND available_at <= NOW()
      ORDER BY priority ASC, id ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE jobs
    SET status = 'running',
        locked_at = NOW(),
        locked_by = ${lockedBy},
        updated_at = NOW()
    WHERE id IN (SELECT id FROM cte)
    RETURNING *
  `);

  return result.rows as Job[];
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
    // Dead-letter: no more retries
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
    // Retry with backoff
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
  // If dedupeKey is provided, check for existing job
  if (job.dedupeKey) {
    const existing = await db.execute(sql`
      SELECT id FROM jobs
      WHERE run_id = ${job.runId}
        AND type = ${job.type}
        AND dedupe_key = ${job.dedupeKey}
      LIMIT 1
    `);

    if (existing.rows.length > 0) {
      // Job already exists, skip
      return;
    }
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
