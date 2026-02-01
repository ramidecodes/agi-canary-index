/**
 * Manual discovery pipeline trigger.
 * POST /api/admin/pipeline/discover
 * Body: { dryRun?: boolean }
 * @see docs/features/03-discovery-pipeline.md
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { runDiscovery } from "@/lib/discovery";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const authRes = await requireAuth();
  if (authRes) return authRes;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not configured" },
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
    const db = getDb();
    const stats = await runDiscovery({
      db,
      options: { openRouterApiKey: apiKey, dryRun },
    });

    return NextResponse.json({
      ok: true,
      dryRun,
      ...stats,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Discovery failed";
    return NextResponse.json({ error: msg, ok: false }, { status: 500 });
  }
}
