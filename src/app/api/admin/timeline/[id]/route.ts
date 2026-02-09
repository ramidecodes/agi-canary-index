/**
 * PUT /api/admin/timeline/[id] — update a timeline event
 * DELETE /api/admin/timeline/[id] — delete a timeline event
 */

import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { timelineEvents } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const body = await request.json();
    const db = getDb();

    const updates: Record<string, unknown> = {};
    if (body.date != null) updates.date = body.date;
    if (body.title != null) updates.title = String(body.title).slice(0, 512);
    if (body.description != null)
      updates.description = String(body.description).slice(0, 2000);
    if (body.eventType != null) updates.eventType = body.eventType;
    if (body.category != null) updates.category = body.category;
    if (body.sourceUrl !== undefined) updates.sourceUrl = body.sourceUrl || null;
    if (body.axesImpacted != null) updates.axesImpacted = body.axesImpacted;
    if (body.isMilestone != null) updates.isMilestone = Boolean(body.isMilestone);
    if (body.significance != null)
      updates.significance = Math.max(1, Math.min(5, Number(body.significance) || 1));

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const [row] = await db
      .update(timelineEvents)
      .set(updates)
      .where(eq(timelineEvents.id, id))
      .returning();

    if (!row) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (err) {
    console.error("[api/admin/timeline] PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update timeline event" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const db = getDb();
    const [row] = await db
      .delete(timelineEvents)
      .where(eq(timelineEvents.id, id))
      .returning();

    if (!row) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    console.error("[api/admin/timeline] DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete timeline event" },
      { status: 500 },
    );
  }
}
