/**
 * GET /api/snapshot/[date]
 * Returns snapshot for a specific date, or nearest available date.
 * @see docs/features/07-capability-profile.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { asc, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailySnapshots } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  try {
    const { date: dateParam } = await params;
    if (!DATE_REGEX.test(dateParam)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 },
      );
    }

    const db = getDb();

    const [exact] = await db
      .select()
      .from(dailySnapshots)
      .where(eq(dailySnapshots.date, dateParam))
      .limit(1);

    if (exact) {
      return NextResponse.json({
        snapshot: {
          id: exact.id,
          date: exact.date,
          axisScores: exact.axisScores ?? {},
          canaryStatuses: exact.canaryStatuses ?? [],
          coverageScore: exact.coverageScore
            ? Number(exact.coverageScore)
            : null,
          signalIds: exact.signalIds ?? [],
          notes: exact.notes ?? [],
          createdAt: exact.createdAt?.toISOString(),
        },
        resolvedDate: exact.date,
        isExact: true,
      });
    }

    const [nearest] = await db
      .select()
      .from(dailySnapshots)
      .where(lte(dailySnapshots.date, dateParam))
      .orderBy(desc(dailySnapshots.date))
      .limit(1);

    if (nearest) {
      return NextResponse.json({
        snapshot: {
          id: nearest.id,
          date: nearest.date,
          axisScores: nearest.axisScores ?? {},
          canaryStatuses: nearest.canaryStatuses ?? [],
          coverageScore: nearest.coverageScore
            ? Number(nearest.coverageScore)
            : null,
          signalIds: nearest.signalIds ?? [],
          notes: nearest.notes ?? [],
          createdAt: nearest.createdAt?.toISOString(),
        },
        resolvedDate: nearest.date,
        isExact: false,
      });
    }

    const [future] = await db
      .select()
      .from(dailySnapshots)
      .where(gte(dailySnapshots.date, dateParam))
      .orderBy(asc(dailySnapshots.date))
      .limit(1);

    if (future) {
      return NextResponse.json({
        snapshot: {
          id: future.id,
          date: future.date,
          axisScores: future.axisScores ?? {},
          canaryStatuses: future.canaryStatuses ?? [],
          coverageScore: future.coverageScore
            ? Number(future.coverageScore)
            : null,
          signalIds: future.signalIds ?? [],
          notes: future.notes ?? [],
          createdAt: future.createdAt?.toISOString(),
        },
        resolvedDate: future.date,
        isExact: false,
      });
    }

    return NextResponse.json(
      { snapshot: null, message: "No snapshots available", resolvedDate: null },
      { status: 200 },
    );
  } catch (err) {
    console.error("[api/snapshot/[date]]", err);
    return NextResponse.json(
      { error: "Failed to fetch snapshot" },
      { status: 500 },
    );
  }
}
