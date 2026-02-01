/**
 * GET /api/brief/archive?limit=30
 * Returns recent daily briefs list (date, coverage, signals count, movement count).
 * @see docs/features/11-daily-brief.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailySnapshots } from "@/lib/db/schema";
import type { BriefArchiveEntry } from "@/lib/brief/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") ?? "30", 10),
      90,
    );

    const db = getDb();
    const rows = await db
      .select({
        date: dailySnapshots.date,
        axisScores: dailySnapshots.axisScores,
        coverageScore: dailySnapshots.coverageScore,
        signalIds: dailySnapshots.signalIds,
      })
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(limit);

    const archive: BriefArchiveEntry[] = rows.map((r) => {
      const axisScores = (r.axisScores ?? {}) as Record<
        string,
        { delta?: number }
      >;
      const movementCount = Object.values(axisScores).filter(
        (e) => e?.delta && Math.abs(e.delta) >= 0.005,
      ).length;
      return {
        date: r.date,
        coverageScore: r.coverageScore ? Number(r.coverageScore) : null,
        signalsProcessed: (r.signalIds ?? []).length,
        movementCount,
      };
    });

    return NextResponse.json({ archive });
  } catch (err) {
    console.error("[api/brief/archive]", err);
    return NextResponse.json(
      { error: "Failed to fetch brief archive" },
      { status: 500 },
    );
  }
}
