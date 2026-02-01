/**
 * GET /api/axis/[axis]/history?days=90
 * Returns historical scores for a single axis (for line chart in axis detail).
 * @see docs/features/07-capability-profile.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { desc, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailySnapshots } from "@/lib/db/schema";
import { AXES } from "@/lib/signal/schemas";

export const dynamic = "force-dynamic";

function isValidAxis(axis: string): boolean {
  return AXES.includes(axis as (typeof AXES)[number]);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ axis: string }> }
) {
  try {
    const { axis } = await params;
    if (!isValidAxis(axis)) {
      return NextResponse.json(
        { error: `Invalid axis. Must be one of: ${AXES.join(", ")}` },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(
      Number.parseInt(searchParams.get("days") ?? "90", 10),
      365
    );

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const db = getDb();
    const rows = await db
      .select({
        date: dailySnapshots.date,
        axisScores: dailySnapshots.axisScores,
      })
      .from(dailySnapshots)
      .where(gte(dailySnapshots.date, cutoffStr))
      .orderBy(desc(dailySnapshots.date))
      .limit(days);

    const history = rows
      .map((r) => {
        const entry = r.axisScores?.[axis];
        if (entry?.score == null) return null;
        const score = Number(entry.score);
        const uncertainty = entry.uncertainty ?? 0.3;
        return {
          date: r.date,
          score,
          uncertainty,
          scorePct: Math.round(((score + 1) / 2) * 100),
          low: Math.max(-1, score - uncertainty),
          high: Math.min(1, score + uncertainty),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    history.reverse();

    return NextResponse.json({ axis, history });
  } catch (err) {
    console.error("[api/axis/[axis]/history]", err);
    return NextResponse.json(
      { error: "Failed to fetch axis history" },
      { status: 500 }
    );
  }
}
