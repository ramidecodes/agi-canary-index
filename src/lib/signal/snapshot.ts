/**
 * Daily snapshot aggregation from signals.
 * Aggregates axis scores from signals for a given date.
 * @see docs/features/05-signal-processing.md
 */

import { sql } from "drizzle-orm";
import { dailySnapshots, signals } from "@/lib/db/schema";
import type { createDb } from "@/lib/db";

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

function directionMultiplier(direction: string): number {
  if (direction === "up") return 1;
  if (direction === "down") return -1;
  return 0;
}

/**
 * Aggregate signals for a date into axis scores and create or update daily_snapshot.
 * Score per axis: confidence-weighted average of (direction * magnitude).
 * Uncertainty: average uncertainty for that axis.
 */
export async function createDailySnapshot(
  db: ReturnType<typeof createDb>,
  dateStr: string,
): Promise<{ created: boolean; signalCount: number }> {
  const rows = await db
    .select({
      id: signals.id,
      axesImpacted: signals.axesImpacted,
      confidence: signals.confidence,
    })
    .from(signals)
    .where(sql`${signals.createdAt}::date = ${dateStr}::date`);

  const axisSums: Record<
    string,
    {
      weightedSum: number;
      weightSum: number;
      uncertaintySum: number;
      count: number;
    }
  > = {};
  for (const axis of AXES) {
    axisSums[axis] = {
      weightedSum: 0,
      weightSum: 0,
      uncertaintySum: 0,
      count: 0,
    };
  }

  for (const row of rows) {
    const confidence = Number(row.confidence) || 0;
    const axes = (row.axesImpacted ?? []) as Array<{
      axis: string;
      direction: string;
      magnitude: number;
      uncertainty?: number;
    }>;
    for (const a of axes) {
      if (!AXES.includes(a.axis as (typeof AXES)[number])) continue;
      const entry = axisSums[a.axis];
      if (!entry) continue;
      const mult = directionMultiplier(a.direction);
      entry.weightedSum += mult * a.magnitude * confidence;
      entry.weightSum += confidence;
      entry.uncertaintySum += a.uncertainty ?? 0.5;
      entry.count += 1;
    }
  }

  const axisScores: Record<
    string,
    { score: number; uncertainty?: number; delta?: number }
  > = {};
  for (const axis of AXES) {
    const e = axisSums[axis];
    const score = e.weightSum > 0 ? e.weightedSum / e.weightSum : 0;
    const uncertainty = e.count > 0 ? e.uncertaintySum / e.count : undefined;
    axisScores[axis] = { score, uncertainty };
  }

  const signalIds = rows.map((r) => r.id);

  await db
    .insert(dailySnapshots)
    .values({
      date: dateStr,
      axisScores,
      signalIds,
      notes: [],
    })
    .onConflictDoUpdate({
      target: dailySnapshots.date,
      set: {
        axisScores,
        signalIds,
        notes: [],
      },
    });

  return {
    created: true,
    signalCount: rows.length,
  };
}
