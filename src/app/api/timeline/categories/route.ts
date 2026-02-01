/**
 * GET /api/timeline/categories
 * Returns distinct categories from reality timeline events.
 */

import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { timelineEvents } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .selectDistinct({ category: timelineEvents.category })
      .from(timelineEvents)
      .where(eq(timelineEvents.eventType, "reality"))
      .orderBy(asc(timelineEvents.category));

    const categories = rows.map((r) => r.category).filter(Boolean);

    return NextResponse.json({ categories });
  } catch (err) {
    console.error("[api/timeline/categories]", err);
    return NextResponse.json(
      { error: "Failed to fetch timeline categories" },
      { status: 500 },
    );
  }
}
