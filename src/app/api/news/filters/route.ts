/**
 * GET /api/news/filters
 * Returns available filter options (axes, date range, source tiers).
 * @see docs/features/11-daily-brief.md
 */

import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  dailySnapshots,
  documents,
  items,
  signals,
  sources,
} from "@/lib/db/schema";
import { AXIS_LABELS } from "@/lib/brief/types";
import type { NewsFiltersOptions } from "@/lib/brief/types";

export const dynamic = "force-dynamic";

const TIER_LABELS: Record<string, string> = {
  TIER_0: "Tier 0",
  TIER_1: "Tier 1",
  DISCOVERY: "Discovery",
};

export async function GET() {
  try {
    const db = getDb();

    const [minSnapshot] = await db
      .select({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .orderBy(asc(dailySnapshots.date))
      .limit(1);
    const [maxSnapshot] = await db
      .select({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(1);

    let minDate: string | null = minSnapshot?.date ?? null;
    let maxDate: string | null = maxSnapshot?.date ?? null;

    if (!minDate || !maxDate) {
      const [minSig] = await db
        .select({ createdAt: signals.createdAt })
        .from(signals)
        .orderBy(asc(signals.createdAt))
        .limit(1);
      const [maxSig] = await db
        .select({ createdAt: signals.createdAt })
        .from(signals)
        .orderBy(desc(signals.createdAt))
        .limit(1);
      if (minSig?.createdAt)
        minDate =
          minSig.createdAt instanceof Date
            ? minSig.createdAt.toISOString().slice(0, 10)
            : String(minSig.createdAt).slice(0, 10);
      if (maxSig?.createdAt)
        maxDate =
          maxSig.createdAt instanceof Date
            ? maxSig.createdAt.toISOString().slice(0, 10)
            : String(maxSig.createdAt).slice(0, 10);
    }

    const tierRows = await db
      .select({ tier: sources.tier })
      .from(sources)
      .innerJoin(items, eq(items.sourceId, sources.id))
      .innerJoin(documents, eq(documents.itemId, items.id));
    const tiers = [...new Set(tierRows.map((r) => r.tier))].filter(Boolean);
    const sourceTiers = (tiers as string[]).map((t) => ({
      value: t,
      label: TIER_LABELS[t] ?? t,
    }));

    const axes = Object.entries(AXIS_LABELS).map(([value, label]) => ({
      value,
      label,
    }));

    const options: NewsFiltersOptions = {
      axes,
      dateRange: { minDate, maxDate },
      sourceTiers,
    };

    return NextResponse.json(options);
  } catch (err) {
    console.error("[api/news/filters]", err);
    return NextResponse.json(
      { error: "Failed to fetch news filters" },
      { status: 500 },
    );
  }
}
