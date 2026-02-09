/**
 * Automated timeline event generation from significant signals.
 * Detects threshold crossings, rapid movements, canary state changes,
 * and high-confidence benchmark results after daily snapshot creation.
 * @see docs/features/05-signal-processing.md
 */

import { sql } from "drizzle-orm";
import { timelineEvents, signals } from "@/lib/db/schema";
import type { createDb } from "@/lib/db";

const AXES_LABELS: Record<string, string> = {
  reasoning: "Reasoning",
  learning_efficiency: "Learning Efficiency",
  long_term_memory: "Long-term Memory",
  planning: "Planning",
  tool_use: "Tool Use",
  social_cognition: "Social Cognition",
  multimodal_perception: "Multimodal Perception",
  robustness: "Robustness",
  alignment_safety: "Alignment & Safety",
};

/** Threshold crossings that generate events. */
const THRESHOLD_LEVELS = [0.5, 0.75] as const;

/** Minimum absolute EMA delta to count as "rapid movement". */
const RAPID_MOVEMENT_THRESHOLD = 0.15;

/** Minimum confidence for benchmark signals to generate events. */
const BENCHMARK_CONFIDENCE_THRESHOLD = 0.7;

interface AxisScoreEntry {
  score: number;
  uncertainty?: number;
  delta?: number;
  signalCount?: number;
}

interface CanaryStatusEntry {
  canary_id: string;
  status: string;
  last_change?: string;
  reason?: string;
}

interface SnapshotData {
  axisScores: Record<string, AxisScoreEntry>;
  canaryStatuses?: CanaryStatusEntry[] | null;
}

interface DetectedEvent {
  title: string;
  description: string;
  category: string;
  axesImpacted: string[];
  sourceUrl?: string | null;
}

/**
 * Detect significant events by comparing current and previous snapshots.
 * Creates timeline_events for:
 * - Threshold crossings (axis crosses 0.5 or 0.75 for the first time)
 * - Rapid movements (axis moves more than 0.15 after EMA smoothing)
 * - Canary state changes
 * - High-confidence benchmark results
 */
export async function detectAndCreateEvents(
  db: ReturnType<typeof createDb>,
  dateStr: string,
  currentSnapshot: SnapshotData,
  previousSnapshot: SnapshotData | null,
): Promise<{ eventsCreated: number }> {
  const detected: DetectedEvent[] = [];
  const prevScores = previousSnapshot?.axisScores ?? {};
  const prevCanaries = previousSnapshot?.canaryStatuses ?? [];

  // 1. Threshold crossings
  for (const [axis, entry] of Object.entries(currentSnapshot.axisScores)) {
    const prevEntry = prevScores[axis];
    const prevScore = prevEntry?.score ?? 0;
    const currentScore = entry.score;
    const label = AXES_LABELS[axis] ?? axis;

    for (const threshold of THRESHOLD_LEVELS) {
      if (currentScore >= threshold && prevScore < threshold) {
        detected.push({
          title: `${label} crosses ${threshold * 100}% threshold`,
          description: `The ${label.toLowerCase()} axis reached ${(currentScore * 100).toFixed(0)}%, crossing the ${threshold * 100}% milestone for the first time. Previous score: ${(prevScore * 100).toFixed(0)}%.`,
          category: "model",
          axesImpacted: [axis],
        });
      }
    }
  }

  // 2. Rapid movements (after EMA smoothing)
  for (const [axis, entry] of Object.entries(currentSnapshot.axisScores)) {
    const delta = entry.delta ?? 0;
    const label = AXES_LABELS[axis] ?? axis;

    if (Math.abs(delta) >= RAPID_MOVEMENT_THRESHOLD) {
      const direction = delta > 0 ? "improvement" : "decline";
      detected.push({
        title: `Significant ${direction} in ${label}`,
        description: `The ${label.toLowerCase()} axis moved ${delta > 0 ? "+" : ""}${(delta * 100).toFixed(1)}% in a single day (EMA-smoothed). This is a notable ${direction} worth monitoring.`,
        category: "model",
        axesImpacted: [axis],
      });
    }
  }

  // 3. Canary state changes
  const currentCanaries = currentSnapshot.canaryStatuses ?? [];
  const prevCanaryMap = new Map(
    prevCanaries.map((c) => [c.canary_id, c]),
  );

  for (const canary of currentCanaries) {
    const prev = prevCanaryMap.get(canary.canary_id);
    if (prev && prev.status !== canary.status) {
      detected.push({
        title: `Canary "${canary.canary_id}" changed: ${prev.status} → ${canary.status}`,
        description: `Risk canary "${canary.canary_id}" changed from ${prev.status} to ${canary.status}. ${canary.reason ?? ""}`.trim(),
        category: "policy",
        axesImpacted: [],
      });
    }
  }

  // 4. High-confidence benchmark results from today's signals
  const benchmarkSignals = await db
    .select({
      id: signals.id,
      claimSummary: signals.claimSummary,
      classification: signals.classification,
      confidence: signals.confidence,
      axesImpacted: signals.axesImpacted,
      sourceUrl: signals.sourceUrl,
    })
    .from(signals)
    .where(
      sql`${signals.createdAt}::date = ${dateStr}::date
        AND ${signals.classification} = 'benchmark_result'
        AND ${signals.confidence}::numeric >= ${String(BENCHMARK_CONFIDENCE_THRESHOLD)}`,
    );

  for (const sig of benchmarkSignals) {
    const axes = (sig.axesImpacted as Array<{ axis: string }>) ?? [];
    detected.push({
      title: `Benchmark: ${sig.claimSummary.slice(0, 80)}`,
      description: sig.claimSummary,
      category: "benchmark",
      axesImpacted: axes.map((a) => a.axis),
      sourceUrl: sig.sourceUrl,
    });
  }

  // Persist detected events (deduplicate by title+date)
  let eventsCreated = 0;
  for (const event of detected) {
    try {
      await db
        .insert(timelineEvents)
        .values({
          date: dateStr,
          title: event.title.slice(0, 512),
          description: event.description.slice(0, 2000),
          eventType: "reality",
          category: event.category,
          sourceUrl: event.sourceUrl ?? null,
          axesImpacted: event.axesImpacted,
        })
        .onConflictDoNothing(); // no unique constraint, but safe to call
      eventsCreated++;
    } catch (err) {
      console.error("[detect-events] Failed to insert event:", event.title, err);
    }
  }

  return { eventsCreated };
}
