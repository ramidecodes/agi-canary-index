/**
 * GET /api/brief/today
 * Returns today's daily brief (movements, coverage, sources checked).
 * @see docs/features/11-daily-brief.md
 */

import { NextResponse } from "next/server";
import { getBriefForDate } from "@/lib/brief/build-brief";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { brief, isExact } = await getBriefForDate(today);
    return NextResponse.json({
      brief,
      isExact,
    });
  } catch (err) {
    console.error("[api/brief/today]", err);
    return NextResponse.json(
      { error: "Failed to fetch today's brief" },
      { status: 500 },
    );
  }
}
