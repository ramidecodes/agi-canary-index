/**
 * Admin API for querying job queue status.
 * GET /api/admin/jobs - Query jobs by status, type, run_id
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { jobs, pipelineRuns } from "@/lib/db/schema";
import { eq, sql, and, desc, type SQL } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

type JobStatus = "pending" | "running" | "retry" | "done" | "failed" | "dead";
type JobType = "discover" | "fetch" | "extract" | "map" | "aggregate";

const validStatuses: JobStatus[] = [
  "pending",
  "running",
  "retry",
  "done",
  "failed",
  "dead",
];
const validTypes: JobType[] = [
  "discover",
  "fetch",
  "extract",
  "map",
  "aggregate",
];

function isValidStatus(value: string): value is JobStatus {
  return validStatuses.includes(value as JobStatus);
}

function isValidType(value: string): value is JobType {
  return validTypes.includes(value as JobType);
}

export async function GET(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const runId = searchParams.get("runId");
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  const db = getDb();
  const conditions: SQL[] = [];

  if (status && isValidStatus(status)) {
    conditions.push(eq(jobs.status, status));
  }
  if (type && isValidType(type)) {
    conditions.push(eq(jobs.type, type));
  }
  if (runId) {
    conditions.push(eq(jobs.runId, runId));
  }

  // Get job counts by status
  const statusCounts = await db.execute(sql`
    SELECT status, COUNT(*) as count
    FROM jobs
    GROUP BY status
  `);

  // Get job counts by type
  const typeCounts = await db.execute(sql`
    SELECT type, COUNT(*) as count
    FROM jobs
    GROUP BY type
  `);

  // Get recent jobs
  let recentJobs = [];
  if (conditions.length > 0) {
    recentJobs = await db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.createdAt))
      .limit(limit);
  } else {
    recentJobs = await db
      .select()
      .from(jobs)
      .orderBy(desc(jobs.createdAt))
      .limit(limit);
  }

  // Get active pipeline runs
  const activeRuns = await db
    .select()
    .from(pipelineRuns)
    .where(eq(pipelineRuns.status, "running"))
    .orderBy(desc(pipelineRuns.startedAt))
    .limit(10);

  return NextResponse.json({
    statusCounts: statusCounts.rows,
    typeCounts: typeCounts.rows,
    recentJobs: recentJobs.slice(0, 50), // Limit to 50 for response size
    activeRuns,
  });
}
