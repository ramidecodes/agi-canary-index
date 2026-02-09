/**
 * GET /api/snapshot/latest
 * Returns the most recent daily snapshot with computed composite fields.
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

const AXIS_LABELS: Record<string, string> = {
  reasoning: "Reasoning",
  learning_efficiency: "Learning",
  long_term_memory: "Memory",
  planning: "Planning",
  tool_use: "Tool Use",
  social_cognition: "Social",
  multimodal_perception: "Multimodal",
  robustness: "Robustness",
  alignment_safety: "Alignment",
};

interface AxisEntry {
  score?: number;
  delta?: number;
  signalCount?: number;
}

export async function GET() {
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { snapshot: null, message: "No snapshots yet" },
        { status: 200 },
      );
    }

    const scores = (row.axisScores ?? {}) as Record<string, AxisEntry>;

    // Compute compositeScore
    let weightedSum = 0;
    let totalWeight = 0;
    for (const axis of AXES) {
      const entry = scores[axis];
      const weight = AXIS_WEIGHTS[axis] ?? 1;
      if (entry?.score != null) {
        const normalized = ((Number(entry.score) + 1) / 2) * 100;
        weightedSum += normalized * weight;
        totalWeight += weight;
      }
    }
    const compositeScore =
      totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;

    // Determine trend
    const advancing = Object.values(scores).filter(
      (e) => (e?.delta ?? 0) > 0.02,
    ).length;
    const declining = Object.values(scores).filter(
      (e) => (e?.delta ?? 0) < -0.02,
    ).length;
    let trend: "advancing" | "declining" | "mixed" | "stable" = "stable";
    if (advancing > declining + 1) trend = "advancing";
    else if (declining > advancing + 1) trend = "declining";
    else if (advancing > 0 && declining > 0) trend = "mixed";

    // Top movers
    const topMovers = AXES.map((axis) => ({
      axis,
      label: AXIS_LABELS[axis] ?? axis,
      delta: (scores[axis] as AxisEntry)?.delta ?? 0,
    }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3);

    // Gap axes (no signal backing)
    const gapAxes = AXES.filter((axis) => {
      const entry = scores[axis] as AxisEntry;
      return (entry?.signalCount ?? 0) === 0;
    });

    return NextResponse.json({
      snapshot: {
        id: row.id,
        date: row.date,
        axisScores: row.axisScores ?? {},
        canaryStatuses: row.canaryStatuses ?? [],
        coverageScore: row.coverageScore ? Number(row.coverageScore) : null,
        signalIds: row.signalIds ?? [],
        notes: row.notes ?? [],
        createdAt: row.createdAt?.toISOString(),
        compositeScore,
        trend,
        topMovers,
        gapAxes,
      },
    });
  } catch (err) {
    console.error("[api/snapshot/latest]", err);
    return NextResponse.json(
      { error: "Failed to fetch latest snapshot" },
      { status: 500 },
    );
  }
}
