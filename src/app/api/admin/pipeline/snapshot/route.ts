/**
 * Daily snapshot generation.
 * POST /api/admin/pipeline/snapshot
 * Body: { date?: string } (YYYY-MM-DD; default: today)
 * Aggregates signals for the date and creates/updates daily_snapshot.
 * @see docs/features/05-signal-processing.md
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createDailySnapshot } from "@/lib/signal";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authRes = await requireAuth();
  if (authRes) return authRes;

  let body: { date?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // Empty body ok
  }

  const dateStr = body.date ?? new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json(
      { error: "Invalid date; use YYYY-MM-DD" },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const result = await createDailySnapshot(db, dateStr);
    return NextResponse.json({
      ok: true,
      date: dateStr,
      signalCount: result.signalCount,
      created: result.created,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Snapshot creation failed";
    return NextResponse.json({ error: msg, ok: false }, { status: 500 });
  }
}
