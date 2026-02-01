/**
 * Manual discovery pipeline trigger.
 * POST /api/admin/pipeline/discover
 * Body: { dryRun?: boolean }
 *
 * Enqueues a DISCOVER job to the Cloudflare Worker so it appears in the job queue
 * and runs through the ETL pipeline. Returns immediately with runId.
 * @see docs/features/03-discovery-pipeline.md
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authRes = await requireAuth();
  if (authRes) return authRes;

  const workerUrl = process.env.WORKER_URL;
  const internalToken = process.env.INTERNAL_TOKEN;

  if (!workerUrl) {
    return NextResponse.json(
      { error: "WORKER_URL not configured", ok: false },
      { status: 500 },
    );
  }

  if (!internalToken) {
    return NextResponse.json(
      { error: "INTERNAL_TOKEN not configured", ok: false },
      { status: 500 },
    );
  }

  let dryRun = false;
  try {
    const body = (await request.json()) as { dryRun?: boolean } | null;
    dryRun = body?.dryRun === true;
  } catch {
    // No body or invalid JSON - default to dryRun false
  }

  try {
    // Enqueue DISCOVER job via Worker
    const enqueueRes = await fetch(`${workerUrl}/jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${internalToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "discover",
        payload: { dryRun },
        priority: 10,
        // No dedupeKey - allow multiple manual discovery runs
      }),
    });

    const enqueueData = (await enqueueRes.json()) as {
      ok?: boolean;
      runId?: string;
      error?: string;
    };

    if (!enqueueRes.ok) {
      return NextResponse.json(
        { error: enqueueData.error ?? "Failed to enqueue job", ok: false },
        { status: enqueueRes.status },
      );
    }

    // Kick the Worker to process the job
    const kickRes = await fetch(`${workerUrl}/run`, {
      method: "POST",
      headers: { Authorization: `Bearer ${internalToken}` },
    });

    const kickData = (await kickRes.json()) as {
      ok?: boolean;
      processed?: number;
      remaining?: number;
      error?: string;
    };

    if (!kickRes.ok) {
      // Job was enqueued but kick failed - still report success
      console.warn("Job enqueued but kick failed:", kickData.error);
    }

    return NextResponse.json({
      ok: true,
      runId: enqueueData.runId,
      jobEnqueued: true,
      dryRun,
      message: dryRun
        ? "Discovery job enqueued (dry run). Check Job Queue Status for progress."
        : "Discovery job enqueued. Check Job Queue Status for progress.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Discovery enqueue failed";
    return NextResponse.json({ error: msg, ok: false }, { status: 500 });
  }
}
