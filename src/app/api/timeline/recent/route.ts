/**
 * GET /api/timeline/recent?limit=10
 * Returns recent timeline events for the home page preview.
 */

import { type NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
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
