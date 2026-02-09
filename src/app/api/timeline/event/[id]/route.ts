/**
 * GET /api/timeline/event/[id]
 * Returns a single timeline event by ID.
 */

import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { timelineEvents } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const db = getDb();
    const rows = await db
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: row.id,
      date: row.date,
      title: row.title,
      description: row.description,
      eventType: row.eventType,
      category: row.category,
      sourceUrl: row.sourceUrl,
      axesImpacted: row.axesImpacted ?? [],
      isMilestone: row.isMilestone,
      significance: row.significance,
    });
  } catch (err) {
    console.error("[api/timeline/event]", err);
    return NextResponse.json(
      { error: "Failed to fetch timeline event" },
      { status: 500 },
    );
  }
}
