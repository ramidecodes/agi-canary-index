/**
 * GET /api/brief/[date]
 * Returns daily brief for a specific date (YYYY-MM-DD).
 * @see docs/features/11-daily-brief.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { getBriefForDate } from "@/lib/brief/build-brief";

export const dynamic = "force-dynamic";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  try {
    const { date: dateParam } = await params;
    if (!DATE_REGEX.test(dateParam)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 },
      );
    }
    const { brief, isExact } = await getBriefForDate(dateParam);
    return NextResponse.json({
      brief,
      isExact,
    });
  } catch (err) {
    console.error("[api/brief/[date]]", err);
    return NextResponse.json(
      { error: "Failed to fetch brief for date" },
      { status: 500 },
    );
  }
}
