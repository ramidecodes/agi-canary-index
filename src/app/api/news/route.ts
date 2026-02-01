/**
 * GET /api/news?limit=20&cursor=&dateFrom=&dateTo=&axis=&sourceTier=
 * Returns paginated news articles (processed documents with primary signal).
 * @see docs/features/11-daily-brief.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { queryNews } from "@/lib/brief/news-query";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") ?? "20", 10),
      50,
    );
    const cursor = searchParams.get("cursor") ?? undefined;
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo = searchParams.get("dateTo") ?? undefined;
    const axis = searchParams.get("axis") ?? undefined;
    const sourceTier = searchParams.get("sourceTier") ?? undefined;

    const db = getDb();
    const { articles, nextCursor } = await queryNews(db, {
      limit,
      cursor,
      dateFrom,
      dateTo,
      axis,
      sourceTier,
    });

    return NextResponse.json({
      articles,
      nextCursor,
    });
  } catch (err) {
    console.error("[api/news]", err);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 },
    );
  }
}
