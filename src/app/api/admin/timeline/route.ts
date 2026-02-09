/**
 * GET /api/admin/timeline — list all timeline events (admin, unfiltered)
 * POST /api/admin/timeline — create a new timeline event
 */

import { type NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { timelineEvents } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(timelineEvents)
      .orderBy(desc(timelineEvents.date));

    return NextResponse.json({ events: rows });
  } catch (err) {
    console.error("[api/admin/timeline] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch timeline events" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      date,
      title,
      description,
      eventType = "reality",
      category = "model",
      sourceUrl,
      axesImpacted,
      isMilestone = false,
      significance = 1,
    } = body;

    if (!date || !title || !description) {
      return NextResponse.json(
        { error: "date, title, and description are required" },
        { status: 400 },
      );
    }

    const db = getDb();
    const [row] = await db
      .insert(timelineEvents)
      .values({
        date,
        title: String(title).slice(0, 512),
        description: String(description).slice(0, 2000),
        eventType,
        category,
        sourceUrl: sourceUrl || null,
        axesImpacted: axesImpacted ?? [],
        isMilestone: Boolean(isMilestone),
        significance: Math.max(1, Math.min(5, Number(significance) || 1)),
      })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error("[api/admin/timeline] POST error:", err);
    return NextResponse.json(
      { error: "Failed to create timeline event" },
      { status: 500 },
    );
  }
}
