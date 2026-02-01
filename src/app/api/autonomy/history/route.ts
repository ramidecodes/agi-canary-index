/**
 * GET /api/autonomy/history?days=90
 * Returns historical autonomy levels for the line chart.
 * @see docs/features/08-autonomy-risk.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { desc, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailySnapshots } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function computeAutonomyLevel(
  scores: Record<string, { score?: number; uncertainty?: number }> | null,
): { level: number; low: number; high: number } | null {
  if (!scores) return null;
  const planning = scores.planning?.score;
  const toolUse = scores.tool_use?.score;
  const alignment = scores.alignment_safety?.score;
  if (planning == null && toolUse == null && alignment == null) return null;

  const p = planning != null ? (Number(planning) + 1) / 2 : 0.5;
  const t = toolUse != null ? (Number(toolUse) + 1) / 2 : 0.5;
  const a = alignment != null ? (Number(alignment) + 1) / 2 : 0.5;
  const level = (p + t + a) / 3;
  const uPlanning = scores.planning?.uncertainty ?? 0.3;
  const uTool = scores.tool_use?.uncertainty ?? 0.3;
  const uAlign = scores.alignment_safety?.uncertainty ?? 0.3;
  const uncertainty = (uPlanning + uTool + uAlign) / 3;

  return {
    level: Math.max(0, Math.min(1, level)),
    low: Math.max(0, level - uncertainty),
    high: Math.min(1, level + uncertainty),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(
      Number.parseInt(searchParams.get("days") ?? "90", 10),
      365,
    );

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const db = getDb();
    const rows = await db
      .select({
        date: dailySnapshots.date,
        axisScores: dailySnapshots.axisScores,
      })
      .from(dailySnapshots)
      .where(gte(dailySnapshots.date, cutoffStr))
      .orderBy(desc(dailySnapshots.date))
      .limit(days);

    const history = rows
      .map((r) => {
        const computed = computeAutonomyLevel(r.axisScores ?? null);
        if (!computed) return null;
        return {
          date: r.date,
          level: Math.round(computed.level * 100),
          low: Math.round(computed.low * 100),
          high: Math.round(computed.high * 100),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    history.reverse();

    return NextResponse.json({ history });
  } catch (err) {
    console.error("[api/autonomy/history]", err);
    return NextResponse.json(
      { error: "Failed to fetch autonomy history" },
      { status: 500 },
    );
  }
}
