/**
 * GET /api/snapshot/history?days=90
 * Returns daily snapshots for the past N days (for radar ghost lines).
 */

import { type NextRequest, NextResponse } from "next/server";
import { desc, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailySnapshots } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(
      Number.parseInt(searchParams.get("days") ?? "90", 10),
      365,
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

    return NextResponse.json({
      history: rows.map((r) => ({
        date: r.date,
        axisScores: r.axisScores ?? {},
      })),
    });
  } catch (err) {
    console.error("[api/snapshot/history]", err);
    return NextResponse.json(
      { error: "Failed to fetch snapshot history" },
      { status: 500 },
    );
  }
}
