/**
 * GET /api/timeline?start=1950&end=2026&category=benchmark
 * Returns timeline events in the given date range, filtered by optional category.
 * Default: reality events only.
 */

import { type NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { timelineEvents } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function toEvent(r: {
  id: string;
  date: string;
  title: string;
  description: string;
  eventType: string;
  category: string;
  sourceUrl: string | null;
  axesImpacted: string[] | null;
  isMilestone: boolean;
  significance: number;
}) {
  return {
    id: r.id,
    date: r.date,
    title: r.title,
    description: r.description,
    eventType: r.eventType,
    category: r.category,
    sourceUrl: r.sourceUrl,
    axesImpacted: r.axesImpacted ?? [],
    isMilestone: r.isMilestone,
    significance: r.significance,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startYear = Number.parseInt(searchParams.get("start") ?? "1950", 10);
    const endYear = Number.parseInt(searchParams.get("end") ?? "2026", 10);
    const category = searchParams.get("category") ?? undefined;

    const startDate = `${Math.max(1950, Math.min(startYear, 2100))}-01-01`;
    const endDate = `${Math.max(1950, Math.min(endYear, 2100))}-12-31`;

    const db = getDb();

    const conditions = [
      eq(timelineEvents.eventType, "reality"),
      gte(timelineEvents.date, startDate),
      lte(timelineEvents.date, endDate),
    ];
    if (category) {
      conditions.push(eq(timelineEvents.category, category));
    }

    const rows = await db
      .select()
      .from(timelineEvents)
      .where(and(...conditions))
      .orderBy(asc(timelineEvents.date));

    return NextResponse.json({
      events: rows.map(toEvent),
    });
  } catch (err) {
    console.error("[api/timeline]", err);
    return NextResponse.json(
      { error: "Failed to fetch timeline events" },
      { status: 500 },
    );
  }
}
