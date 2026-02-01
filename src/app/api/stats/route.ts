/**
 * GET /api/stats
 * Returns public stats for the home page header.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select({ id: sources.id })
      .from(sources)
      .where(eq(sources.isActive, true));

    return NextResponse.json({
      sourceCount: rows.length,
    });
  } catch (err) {
    console.error("[api/stats]", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
