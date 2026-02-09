/**
 * GET /api/autonomy/current
 * Returns current autonomy level and uncertainty (derived from planning, tool_use, alignment_safety axes).
 * @see docs/features/08-autonomy-risk.md
 */

import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailySnapshots, signals } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/** Minimum signals in last 7 days to show a confident autonomy level. */
const MIN_SIGNALS_FOR_CONFIDENCE = 10;

/** Autonomy levels 0–4 as per FRED. Maps normalized 0–1 to level index. */
const AUTONOMY_LEVELS = [
  { id: 0, label: "Tool-only (Level 0)" },
  { id: 1, label: "Scripted agent (Level 1)" },
  { id: 2, label: "Adaptive agent (Level 2)" },
  { id: 3, label: "Long-horizon agent (Level 3)" },
  { id: 4, label: "Self-directed (Level 4)" },
];

function normalizedToLevel(normalized: number): number {
  return Math.max(0, Math.min(4, Math.round(normalized * 4)));
}

export async function GET() {
  try {
    const db = getDb();

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(signals)
      .where(sql`${signals.createdAt} > NOW() - INTERVAL '7 days'`);

    const totalSignalsLast7Days = Number(countRow?.count ?? 0);

    if (totalSignalsLast7Days < MIN_SIGNALS_FOR_CONFIDENCE) {
      return NextResponse.json({
        insufficientData: true,
        level: 0.35,
        levelIndex: 1,
        levelLabel: "Insufficient data",
        uncertainty: 0.3,
        levels: AUTONOMY_LEVELS,
        lastUpdated: null,
        message: "Need more signals for accurate assessment",
      });
    }

    const [row] = await db
      .select()
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(1);

    if (!row || !row.axisScores) {
      return NextResponse.json({
        level: 0.35,
        levelIndex: 1,
        levelLabel: "Scripted agent (Level 1)",
        uncertainty: 0.3,
        levels: AUTONOMY_LEVELS,
        lastUpdated: null,
        insufficientData: true,
      });
    }

    const scores = row.axisScores;
    const planning = scores.planning?.score;
    const toolUse = scores.tool_use?.score;
    const alignment = scores.alignment_safety?.score;

    const p = planning != null ? (Number(planning) + 1) / 2 : 0.5;
    const t = toolUse != null ? (Number(toolUse) + 1) / 2 : 0.5;
    const a = alignment != null ? (Number(alignment) + 1) / 2 : 0.5;

    const level = (p + t + a) / 3;
    const uPlanning = scores.planning?.uncertainty ?? 0.3;
    const uTool = scores.tool_use?.uncertainty ?? 0.3;
    const uAlign = scores.alignment_safety?.uncertainty ?? 0.3;
    const uncertainty = (uPlanning + uTool + uAlign) / 3;

    let levelIndex = normalizedToLevel(level);

    // Confidence gate: if uncertainty is too high, cap at Level 2
    const highUncertainty = uncertainty > 0.4;
    if (highUncertainty && levelIndex > 2) {
      levelIndex = 2;
    }

    const levelLabel = highUncertainty && levelIndex === 2
      ? "Adaptive agent (Level 2) — high uncertainty"
      : AUTONOMY_LEVELS[levelIndex]?.label ?? "Unknown";

    return NextResponse.json({
      level: Math.max(0, Math.min(1, level)),
      levelIndex,
      levelLabel,
      uncertainty: Math.max(0.1, Math.min(0.5, uncertainty)),
      highUncertainty,
      levels: AUTONOMY_LEVELS,
      lastUpdated: row.createdAt?.toISOString() ?? null,
      insufficientData: false,
    });
  } catch (err) {
    console.error("[api/autonomy/current]", err);
    return NextResponse.json(
      { error: "Failed to fetch autonomy level" },
      { status: 500 },
    );
  }
}
