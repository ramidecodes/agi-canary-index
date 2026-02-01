/**
 * GET /api/snapshot/latest
 * Returns the most recent daily snapshot for the home page.
 */

import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailySnapshots } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { snapshot: null, message: "No snapshots yet" },
        { status: 200 },
      );
    }

    return NextResponse.json({
      snapshot: {
        id: row.id,
        date: row.date,
        axisScores: row.axisScores ?? {},
        canaryStatuses: row.canaryStatuses ?? [],
        coverageScore: row.coverageScore ? Number(row.coverageScore) : null,
        signalIds: row.signalIds ?? [],
        notes: row.notes ?? [],
        createdAt: row.createdAt?.toISOString(),
      },
    });
  } catch (err) {
    console.error("[api/snapshot/latest]", err);
    return NextResponse.json(
      { error: "Failed to fetch latest snapshot" },
      { status: 500 },
    );
  }
}
