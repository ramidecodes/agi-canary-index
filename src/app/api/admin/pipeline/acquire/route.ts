/**
 * Manual acquisition pipeline trigger.
 * POST /api/admin/pipeline/acquire
 * Body: { itemIds?: string[] }
 * Runs acquisition directly via Firecrawl + R2.
 * @see docs/features/04-acquisition-pipeline.md
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createR2Bucket } from "@/lib/r2";
import { runAcquisition } from "@/lib/acquisition";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const authRes = await requireAuth();
  if (authRes) return authRes;

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) {
    return NextResponse.json(
      { error: "FIRECRAWL_API_KEY not configured", ok: false },
      { status: 500 }
    );
  }

  let body: { itemIds?: string[] } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // Empty body ok
  }

  try {
    const db = getDb();
    const r2Bucket = createR2Bucket();
    const stats = await runAcquisition(
      {
        db,
        firecrawlApiKey: firecrawlKey,
        r2Bucket,
      },
      { itemIds: body.itemIds }
    );
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Acquisition failed";
    return NextResponse.json({ error: msg, ok: false }, { status: 500 });
  }
}
