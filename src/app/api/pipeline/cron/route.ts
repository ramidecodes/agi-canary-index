/**
 * Vercel Cron entry point - daily pipeline run.
 * GET /api/pipeline/cron (Vercel sends CRON_SECRET as Bearer token)
 * Runs discovery → acquire. Auth: Authorization: Bearer ${CRON_SECRET}
 * @see docs/features/03-discovery-pipeline.md
 * @see docs/features/04-acquisition-pipeline.md
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createR2Bucket } from "@/lib/r2";
import { runDiscovery } from "@/lib/discovery";
import { runAcquisition } from "@/lib/acquisition";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function requireCronAuth(request: Request): NextResponse | null {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  const expected = process.env.CRON_SECRET;
  if (!expected || token !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  const dbUrl = process.env.DATABASE_URL;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;

  if (!dbUrl || !openRouterKey) {
    return NextResponse.json(
      { error: "DATABASE_URL and OPENROUTER_API_KEY required" },
      { status: 500 }
    );
  }

  const db = getDb();

  try {
    const discoveryStats = await runDiscovery({
      db,
      options: { openRouterApiKey: openRouterKey, dryRun: false },
    });

    let acquisitionStats = null;
    if (
      firecrawlKey &&
      discoveryStats.itemsInserted > 0 &&
      discoveryStats.insertedItemIds?.length
    ) {
      const r2Bucket = createR2Bucket();
      const itemIds = discoveryStats.insertedItemIds.slice(0, 50);
      acquisitionStats = await runAcquisition(
        {
          db,
          firecrawlApiKey: firecrawlKey,
          r2Bucket,
        },
        { itemIds }
      );
    }

    return NextResponse.json({
      ok: true,
      discovery: discoveryStats,
      acquisition: acquisitionStats ?? undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Pipeline failed";
    return NextResponse.json({ error: msg, ok: false }, { status: 500 });
  }
}
