/**
 * GET /api/timeline/recent?limit=10
 * Returns recent reality-track timeline events for the home page preview.
 * @see docs/features/18-timeline-events-home-preview.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { timelineEvents } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") ?? "10", 10),
      50,
    );

    const db = getDb();
    const rows = await db
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.eventType, "reality"))
      .orderBy(desc(timelineEvents.date))
      .limit(limit);

    return NextResponse.json({
      events: rows.map((r) => ({
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
      })),
    });
  } catch (err) {
    console.error("[api/timeline/recent]", err);
    return NextResponse.json(
      { error: "Failed to fetch timeline events" },
      { status: 500 },
    );
  }
}
