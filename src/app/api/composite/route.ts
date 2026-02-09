/**
 * GET /api/composite
 * Returns composite AGI progress score (0-100), component breakdown, week-over-week delta, trend direction.
 */

import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailySnapshots } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const AXES = [
  "reasoning",
  "learning_efficiency",
  "long_term_memory",
  "planning",
  "tool_use",
  "social_cognition",
  "multimodal_perception",
  "robustness",
  "alignment_safety",
] as const;

/** Weights for computing the composite score (higher = more important for AGI). */
const AXIS_WEIGHTS: Record<string, number> = {
  reasoning: 1.5,
  learning_efficiency: 1.3,
  planning: 1.3,
  tool_use: 1.2,
  long_term_memory: 1.0,
  social_cognition: 0.9,
  multimodal_perception: 0.9,
  robustness: 1.1,
  alignment_safety: 1.2,
};

function normalizeScore(score: number): number {
  return Math.max(0, Math.min(100, ((score + 1) / 2) * 100));
}

export async function GET() {
  try {
    const db = getDb();
    const snapshots = await db
      .select()
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(8); // Current + 7 days for trend

    if (snapshots.length === 0) {
      return NextResponse.json({
        compositeScore: 0,
        trend: "stable",
        weekOverWeekDelta: 0,
        breakdown: {},
        gapAxes: AXES.map((a) => a),
        topMovers: [],
      });
    }

    const latest = snapshots[0];
    const scores = latest.axisScores ?? {};

    // Compute weighted composite
    let weightedSum = 0;
    let totalWeight = 0;
    const breakdown: Record<
      string,
      { score: number; weight: number; normalized: number }
    > = {};
    const gapAxes: string[] = [];

    for (const axis of AXES) {
      const entry = scores[axis] as
        | { score?: number; signalCount?: number }
        | undefined;
      const weight = AXIS_WEIGHTS[axis] ?? 1;
      const signalCount = (entry as { signalCount?: number })?.signalCount ?? 0;

      if (entry?.score != null && signalCount > 0) {
        const normalized = normalizeScore(Number(entry.score));
        weightedSum += normalized * weight;
        totalWeight += weight;
        breakdown[axis] = {
          score: Number(entry.score),
          weight,
          normalized,
        };
      } else {
        gapAxes.push(axis);
      }
    }

    const compositeScore =
      totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;

    // Week-over-week delta
    const weekAgoSnapshot = snapshots.find((_s, i) => i >= 6);
    let weekOverWeekDelta = 0;
    if (weekAgoSnapshot?.axisScores) {
      const prevScores = weekAgoSnapshot.axisScores;
      let prevWeightedSum = 0;
      let prevTotalWeight = 0;
      for (const axis of AXES) {
        const entry = prevScores[axis] as { score?: number } | undefined;
        const weight = AXIS_WEIGHTS[axis] ?? 1;
        if (entry?.score != null) {
          prevWeightedSum += normalizeScore(Number(entry.score)) * weight;
          prevTotalWeight += weight;
        }
      }
      const prevComposite =
        prevTotalWeight > 0 ? prevWeightedSum / prevTotalWeight : 0;
      weekOverWeekDelta =
        Math.round((compositeScore - prevComposite) * 10) / 10;
    }

    // Trend direction
    let trend: "advancing" | "declining" | "mixed" | "stable" = "stable";
    if (weekOverWeekDelta > 2) trend = "advancing";
    else if (weekOverWeekDelta < -2) trend = "declining";
    else if (Math.abs(weekOverWeekDelta) > 0.5) trend = "mixed";

    // Top movers (by absolute delta)
    const topMovers = AXES.map((axis) => {
      const entry = scores[axis] as
        | { score?: number; delta?: number }
        | undefined;
      return {
        axis,
        delta: (entry as { delta?: number })?.delta ?? 0,
        score: entry?.score ?? 0,
      };
    })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3);

    return NextResponse.json({
      compositeScore,
      trend,
      weekOverWeekDelta,
      breakdown,
      gapAxes,
      topMovers,
    });
  } catch (err) {
    console.error("[api/composite]", err);
    return NextResponse.json(
      { error: "Failed to compute composite score" },
      { status: 500 },
    );
  }
}
