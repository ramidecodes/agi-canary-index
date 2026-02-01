/**
 * GET /api/snapshot/range?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Returns min/max snapshot dates for the time scrubber.
 * @see docs/features/07-capability-profile.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { asc, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailySnapshots } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const db = getDb();

    const [minRow] = await db
      .select({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .orderBy(asc(dailySnapshots.date))
      .limit(1);

    const [maxRow] = await db
      .select({ date: dailySnapshots.date })
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(1);

    const minDate = minRow?.date ?? null;
    const maxDate = maxRow?.date ?? null;

    return NextResponse.json({
      minDate,
      maxDate,
    });
  } catch (err) {
    console.error("[api/snapshot/range]", err);
    return NextResponse.json(
      { error: "Failed to fetch snapshot range" },
      { status: 500 },
    );
  }
}
