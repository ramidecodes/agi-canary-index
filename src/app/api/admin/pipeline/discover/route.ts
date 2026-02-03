/**
 * Manual discovery pipeline trigger.
 * POST /api/admin/pipeline/discover
 * Body: { dryRun?: boolean }
 *
 * Creates a pipeline run and enqueues a DISCOVER job. Processing runs via
 * GitHub Actions (scheduled or workflow_dispatch). Returns immediately with runId.
 * @see docs/features/03-discovery-pipeline.md
 * @see docs/features/20-pipeline-github-actions.md
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createPipelineRun, enqueueJob } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authRes = await requireAuth();
  if (authRes) return authRes;

  let dryRun = false;
  try {
    const body = (await request.json()) as { dryRun?: boolean } | null;
    dryRun = body?.dryRun === true;
  } catch {
    // No body or invalid JSON - default to dryRun false
  }

  try {
    const db = getDb();
    const runId = await createPipelineRun(db);
    await enqueueJob(db, {
      runId,
      type: "discover",
      payload: { dryRun },
      priority: 10,
    });

    return NextResponse.json({
      ok: true,
      runId,
      jobEnqueued: true,
      dryRun,
      message: dryRun
        ? "Discovery job enqueued (dry run). Pipeline runs via GitHub Actions; check Job Queue Status for progress."
        : "Discovery job enqueued. Pipeline runs via GitHub Actions; check Job Queue Status for progress.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Discovery enqueue failed";
    return NextResponse.json({ error: msg, ok: false }, { status: 500 });
  }
}
