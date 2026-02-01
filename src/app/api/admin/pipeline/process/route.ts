/**
 * Manual signal processing pipeline trigger.
 * POST /api/admin/pipeline/process
 * Body: { documentIds?: string[] }
 * Processes acquired documents with AI extraction and creates signals.
 * @see docs/features/05-signal-processing.md
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { runSignalProcessing } from "@/lib/signal";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const authRes = await requireAuth();
  if (authRes) return authRes;

  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    return NextResponse.json(
      {
        error: "OPENROUTER_API_KEY not configured",
        hint: "Set OPENROUTER_API_KEY in Vercel env for AI signal extraction.",
      },
      { status: 503 }
    );
  }

  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) {
    return NextResponse.json(
      {
        error: "R2_BUCKET_NAME not configured",
        hint: "Set R2_BUCKET_NAME in Vercel env to fetch document content.",
      },
      { status: 503 }
    );
  }

  let body: { documentIds?: string[] } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // Empty body ok
  }

  try {
    const db = getDb();
    const stats = await runSignalProcessing(
      {
        db,
        r2BucketName: bucketName,
        openRouterApiKey,
      },
      { documentIds: body.documentIds }
    );

    return NextResponse.json({
      ok: true,
      documentsProcessed: stats.documentsProcessed,
      documentsFailed: stats.documentsFailed,
      signalsCreated: stats.signalsCreated,
      durationMs: stats.durationMs,
      perDocument: stats.perDocument,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signal processing failed";
    return NextResponse.json({ error: msg, ok: false }, { status: 500 });
  }
}
