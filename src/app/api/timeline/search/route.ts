/**
 * GET /api/timeline/search?q=keyword
 * Searches timeline events by title and description (ILIKE).
 */

import { type NextRequest, NextResponse } from "next/server";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { timelineEvents } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 50;

function toEvent(r: {
  id: string;
  date: string;
  title: string;
  description: string;
  eventType: string;
  category: string;
  sourceUrl: string | null;
  axesImpacted: string[] | null;
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
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({
        events: [],
        message: "Query must be at least 2 characters",
      });
    }

    const pattern = `%${q}%`;

    const db = getDb();
    const rows = await db
      .select()
      .from(timelineEvents)
      .where(
        and(
          eq(timelineEvents.eventType, "reality"),
          or(
            ilike(timelineEvents.title, pattern),
            ilike(timelineEvents.description, pattern),
          ),
        ),
      )
      .orderBy(asc(timelineEvents.date))
      .limit(MAX_RESULTS);

    return NextResponse.json({
      events: rows.map(toEvent),
    });
  } catch (err) {
    console.error("[api/timeline/search]", err);
    return NextResponse.json(
      { error: "Failed to search timeline events" },
      { status: 500 },
    );
  }
}
