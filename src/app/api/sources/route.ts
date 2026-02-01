/**
 * GET /api/sources
 * Public list of active data sources (transparency).
 * No auth required.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: sources.id,
        name: sources.name,
        url: sources.url,
        tier: sources.tier,
        domainType: sources.domainType,
        sourceType: sources.sourceType,
        cadence: sources.cadence,
        trustWeight: sources.trustWeight,
        lastSuccessAt: sources.lastSuccessAt,
        errorCount: sources.errorCount,
      })
      .from(sources)
      .where(eq(sources.isActive, true))
      .orderBy(asc(sources.tier), asc(sources.name));

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[api/sources]", err);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 },
    );
  }
}
