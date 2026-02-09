/**
 * Daily snapshot aggregation from signals.
 * Uses 7-day EMA smoothing to eliminate score volatility and the "zero-cliff" problem.
 * Computes coverage_score and canary_statuses for each snapshot.
 * @see docs/features/05-signal-processing.md
 */

import { and, asc, eq, gte, sql } from "drizzle-orm";
import {
  canaryDefinitions,
  dailySnapshots,
  signals,
  documents,
  items,
} from "@/lib/db/schema";
import type { createDb } from "@/lib/db";

/** EMA blending factor: weight for today's signals vs. history. Higher = more responsive. */
const EMA_ALPHA = 0.3;

/** When no new signals arrive, carry forward with slight decay toward neutral. */
const DECAY_FACTOR = 0.98;

/** Number of days of signal history to consider for coverage. */
const COVERAGE_WINDOW_DAYS = 7;

/** Minimum signal count per axis for "adequate" coverage. */
const MIN_SIGNALS_FOR_COVERAGE = 3;

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

/** Get previous day as YYYY-MM-DD. */
function previousDay(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Get date N days ago as YYYY-MM-DD. */
function daysAgo(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function directionMultiplier(direction: string): number {
  if (direction === "up") return 1;
  if (direction === "down") return -1;
  return 0;
}

type AxisImpact = {
  axis: string;
  direction: string;
  magnitude: number;
  uncertainty?: number;
};

interface AxisAggregation {
  weightedSum: number;
  weightSum: number;
  uncertaintySum: number;
  count: number;
  /** Unique source IDs contributing to this axis */
  sourceIds: Set<string>;
  /** Individual signal scores (for agreement calculation) */
  signalScores: number[];
}

function createEmptyAxisAggregation(): AxisAggregation {
  return {
    weightedSum: 0,
    weightSum: 0,
    uncertaintySum: 0,
    count: 0,
    sourceIds: new Set(),
    signalScores: [],
  };
}

/**
 * Improved uncertainty estimation factoring in signal count, agreement, and source diversity.
 * Returns a value in the range [0.1, 0.5].
 */
function computeUncertainty(agg: AxisAggregation): number | undefined {
  if (agg.count === 0) return undefined;

  // Base: average per-signal uncertainty
  const baseUncertainty = agg.uncertaintySum / agg.count;

  // Signal count factor: more signals = lower uncertainty (sigmoid decay)
  const countFactor = 1 / (1 + agg.count / 5); // approaches 0 as count grows

  // Agreement factor: if signals disagree, uncertainty is higher
  let agreementFactor = 0;
  if (agg.signalScores.length >= 2) {
    const mean =
      agg.signalScores.reduce((a, b) => a + b, 0) / agg.signalScores.length;
    const variance =
      agg.signalScores.reduce((sum, s) => sum + (s - mean) ** 2, 0) /
      agg.signalScores.length;
    agreementFactor = Math.min(1, Math.sqrt(variance)); // 0 = perfect agreement
  }

  // Source diversity factor: single source = higher uncertainty
  const diversityFactor = agg.sourceIds.size <= 1 ? 0.15 : 0;

  const raw =
    baseUncertainty * 0.3 +
    countFactor * 0.3 +
    agreementFactor * 0.25 +
    diversityFactor * 0.15;

  // Clamp to meaningful range [0.1, 0.5]
  return Math.max(0.1, Math.min(0.5, raw));
}

/**
 * Compute coverage_score: fraction of axes with adequate signal backing
 * in the last 7 days, weighted by source diversity.
 */
function computeCoverageScore(
  axisSignalCounts: Record<string, number>,
  axisSourceCounts: Record<string, number>,
): number {
  let coveredAxes = 0;
  let totalWeight = 0;

  for (const axis of AXES) {
    const signalCount = axisSignalCounts[axis] ?? 0;
    const sourceCount = axisSourceCounts[axis] ?? 0;

    // Base coverage: has enough signals
    const hasCoverage = signalCount >= MIN_SIGNALS_FOR_COVERAGE;
    // Diversity bonus: multiple sources is better
    const diversityBonus = Math.min(1, sourceCount / 3); // up to 3 sources = full credit

    const axisWeight = hasCoverage ? 0.7 + 0.3 * diversityBonus : 0;
    coveredAxes += axisWeight;
    totalWeight += 1;
  }

  return totalWeight > 0
    ? Math.round((coveredAxes / totalWeight) * 100) / 100
    : 0;
}

/** Parse a threshold string like "<10%", ">50%", ">=30%" into { op, value }. */
function parseThreshold(t: unknown): { op: string; value: number } | null {
  if (typeof t !== "string") return null;
  const match = t.match(/^([<>]=?)\s*(\d+(?:\.\d+)?)\s*%?$/);
  if (!match) return null;
  return { op: match[1], value: Number(match[2]) / 100 };
}

function evaluateThreshold(
  score: number,
  threshold: { op: string; value: number },
): boolean {
  switch (threshold.op) {
    case "<":
      return score < threshold.value;
    case "<=":
      return score <= threshold.value;
    case ">":
      return score > threshold.value;
    case ">=":
      return score >= threshold.value;
    default:
      return false;
  }
}

/**
 * Compute canary statuses based on axis scores and canary definitions.
 */
async function computeCanaryStatuses(
  db: ReturnType<typeof createDb>,
  axisScores: Record<
    string,
    { score: number; uncertainty?: number; delta?: number; signalCount?: number }
  >,
  prevCanaryStatuses: Array<{
    canary_id: string;
    status: string;
    last_change?: string;
  }> | null,
  dateStr: string,
): Promise<
  Array<{
    canary_id: string;
    status: string;
    last_change?: string;
    confidence?: number;
    reason?: string;
  }>
> {
  const definitions = await db
    .select()
    .from(canaryDefinitions)
    .where(eq(canaryDefinitions.isActive, true))
    .orderBy(asc(canaryDefinitions.displayOrder));

  const prevMap = new Map(
    (prevCanaryStatuses ?? []).map((s) => [s.canary_id, s]),
  );

  return definitions.map((def) => {
    const axesWatched = (def.axesWatched as string[]) ?? [];
    const thresholds = (def.thresholds ?? {}) as Record<string, unknown>;

    if (axesWatched.length === 0) {
      return { canary_id: def.id, status: "gray", reason: "No axes configured" };
    }

    // Compute average normalized score across watched axes
    let sum = 0;
    let count = 0;
    let totalUncertainty = 0;
    const reasons: string[] = [];

    for (const axis of axesWatched) {
      const entry = axisScores[axis];
      if (entry?.score != null) {
        const normalized = (Number(entry.score) + 1) / 2; // -1..1 → 0..1
        sum += normalized;
        count++;
        totalUncertainty += entry.uncertainty ?? 0.3;
      }
    }

    if (count === 0) {
      return { canary_id: def.id, status: "gray", reason: "No data for watched axes" };
    }

    const avgScore = sum / count;
    const avgUncertainty = totalUncertainty / count;

    // Evaluate thresholds: check red first, then yellow, then green
    let status: string = "gray";

    const redThreshold = parseThreshold(thresholds.red);
    const yellowThreshold = parseThreshold(thresholds.yellow);
    const greenThreshold = parseThreshold(thresholds.green);

    if (redThreshold && evaluateThreshold(avgScore, redThreshold)) {
      status = "red";
      reasons.push(
        `Score ${(avgScore * 100).toFixed(0)}% ${thresholds.red as string}`,
      );
    } else if (
      yellowThreshold &&
      evaluateThreshold(avgScore, yellowThreshold)
    ) {
      status = "yellow";
      reasons.push(
        `Score ${(avgScore * 100).toFixed(0)}% ${thresholds.yellow as string}`,
      );
    } else if (greenThreshold && evaluateThreshold(avgScore, greenThreshold)) {
      status = "green";
      reasons.push(
        `Score ${(avgScore * 100).toFixed(0)}% ${thresholds.green as string}`,
      );
    } else {
      // Default: derive from score level
      if (avgScore >= 0.6) status = "green";
      else if (avgScore >= 0.3) status = "yellow";
      else status = "red";
      reasons.push(`Score ${(avgScore * 100).toFixed(0)}%`);
    }

    const prev = prevMap.get(def.id);
    const lastChange =
      prev?.status !== status
        ? dateStr
        : prev?.last_change ?? dateStr;

    return {
      canary_id: def.id,
      status,
      last_change: lastChange,
      confidence: Math.max(0.1, Math.min(1, 1 - avgUncertainty)),
      reason: reasons.join("; "),
    };
  });
}

/**
 * Aggregate signals for a date into axis scores using 7-day EMA smoothing.
 * Also computes coverage_score and canary_statuses.
 *
 * Score per axis: EMA blend of today's confidence-weighted score with previous snapshot.
 * When no signals touch an axis today, the score decays slightly toward neutral (not zero).
 */
export async function createDailySnapshot(
  db: ReturnType<typeof createDb>,
  dateStr: string,
): Promise<{ created: boolean; signalCount: number }> {
  // Fetch today's signals (for axis scoring)
  const todayRows = await db
    .select({
      id: signals.id,
      axesImpacted: signals.axesImpacted,
      confidence: signals.confidence,
      documentId: signals.documentId,
    })
    .from(signals)
    .where(sql`${signals.createdAt}::date = ${dateStr}::date`);

  // Fetch 7-day window signals for coverage computation
  const windowStart = daysAgo(dateStr, COVERAGE_WINDOW_DAYS);
  const windowRows = await db
    .select({
      id: signals.id,
      axesImpacted: signals.axesImpacted,
      documentId: signals.documentId,
    })
    .from(signals)
    .where(
      and(
        gte(signals.createdAt, new Date(`${windowStart}T00:00:00Z`)),
        sql`${signals.createdAt}::date <= ${dateStr}::date`,
      ),
    );

  // Resolve source IDs for today's signals (for diversity tracking)
  const docIds = [...new Set(todayRows.map((r) => r.documentId))];
  const docSourceMap = new Map<string, string>();
  if (docIds.length > 0) {
    // Build mapping: documentId → sourceId
    const docSourceRows = await db
      .select({
        docId: documents.id,
        sourceId: items.sourceId,
      })
      .from(documents)
      .innerJoin(items, eq(documents.itemId, items.id))
      .where(sql`${documents.id} = ANY(${docIds})`);
    for (const r of docSourceRows) {
      docSourceMap.set(r.docId, r.sourceId);
    }
  }

  // Also resolve source IDs for 7-day window (for coverage diversity)
  const windowDocIds = [...new Set(windowRows.map((r) => r.documentId))];
  const windowDocSourceMap = new Map<string, string>();
  if (windowDocIds.length > 0) {
    const windowDocSourceRows = await db
      .select({
        docId: documents.id,
        sourceId: items.sourceId,
      })
      .from(documents)
      .innerJoin(items, eq(documents.itemId, items.id))
      .where(sql`${documents.id} = ANY(${windowDocIds})`);
    for (const r of windowDocSourceRows) {
      windowDocSourceMap.set(r.docId, r.sourceId);
    }
  }

  // Aggregate today's signals per axis
  const axisSums: Record<string, AxisAggregation> = {};
  for (const axis of AXES) {
    axisSums[axis] = createEmptyAxisAggregation();
  }

  for (const row of todayRows) {
    const confidence = Number(row.confidence) || 0;
    const axes = (row.axesImpacted ?? []) as AxisImpact[];
    const sourceId = docSourceMap.get(row.documentId) ?? "unknown";

    for (const a of axes) {
      if (!AXES.includes(a.axis as (typeof AXES)[number])) continue;
      const entry = axisSums[a.axis];
      if (!entry) continue;
      const mult = directionMultiplier(a.direction);
      const signalScore = mult * a.magnitude;
      entry.weightedSum += signalScore * confidence;
      entry.weightSum += confidence;
      entry.uncertaintySum += a.uncertainty ?? 0.5;
      entry.count += 1;
      entry.sourceIds.add(sourceId);
      entry.signalScores.push(signalScore);
    }
  }

  // Compute 7-day coverage stats per axis
  const axisWindowCounts: Record<string, number> = {};
  const axisWindowSourceIds: Record<string, Set<string>> = {};
  for (const axis of AXES) {
    axisWindowCounts[axis] = 0;
    axisWindowSourceIds[axis] = new Set();
  }
  for (const row of windowRows) {
    const axes = (row.axesImpacted ?? []) as AxisImpact[];
    const sourceId = windowDocSourceMap.get(row.documentId) ?? "unknown";
    for (const a of axes) {
      if (!AXES.includes(a.axis as (typeof AXES)[number])) continue;
      axisWindowCounts[a.axis] = (axisWindowCounts[a.axis] ?? 0) + 1;
      if (!axisWindowSourceIds[a.axis]) {
        axisWindowSourceIds[a.axis] = new Set();
      }
      axisWindowSourceIds[a.axis].add(sourceId);
    }
  }

  // Fetch previous snapshot for EMA blending
  const prevDate = previousDay(dateStr);
  const [prevSnapshot] = await db
    .select({
      axisScores: dailySnapshots.axisScores,
      canaryStatuses: dailySnapshots.canaryStatuses,
    })
    .from(dailySnapshots)
    .where(eq(dailySnapshots.date, prevDate))
    .limit(1);
  const prevScores = (prevSnapshot?.axisScores ?? {}) as Record<
    string,
    { score?: number; signalCount?: number }
  >;
  const prevCanaryStatuses = (prevSnapshot?.canaryStatuses ?? null) as Array<{
    canary_id: string;
    status: string;
    last_change?: string;
  }> | null;

  // Compute EMA-smoothed axis scores
  const axisScores: Record<
    string,
    {
      score: number;
      uncertainty?: number;
      delta?: number;
      signalCount?: number;
      sourceCount?: number;
    }
  > = {};

  for (const axis of AXES) {
    const agg = axisSums[axis];
    const prevScore = prevScores[axis]?.score ?? 0;
    const todaySignalCount = agg.count;

    let score: number;

    if (todaySignalCount > 0) {
      // Today has signals: compute raw score and blend with EMA
      const todayRawScore = agg.weightedSum / agg.weightSum;
      score = EMA_ALPHA * todayRawScore + (1 - EMA_ALPHA) * prevScore;
    } else {
      // No new signals: carry forward with slight decay toward neutral (0)
      score = prevScore * DECAY_FACTOR;
    }

    const uncertainty = computeUncertainty(agg);
    const delta = Math.round((score - prevScore) * 1000) / 1000;

    axisScores[axis] = {
      score,
      uncertainty,
      delta,
      signalCount: axisWindowCounts[axis] ?? 0,
      sourceCount: axisWindowSourceIds[axis]?.size ?? 0,
    };
  }

  // Compute coverage score
  const axisSourceCounts: Record<string, number> = {};
  for (const axis of AXES) {
    axisSourceCounts[axis] = axisWindowSourceIds[axis]?.size ?? 0;
  }
  const coverageScore = computeCoverageScore(axisWindowCounts, axisSourceCounts);

  // Compute canary statuses
  const canaryStatuses = await computeCanaryStatuses(
    db,
    axisScores,
    prevCanaryStatuses,
    dateStr,
  );

  const signalIds = todayRows.map((r) => r.id);

  await db
    .insert(dailySnapshots)
    .values({
      date: dateStr,
      axisScores,
      signalIds,
      coverageScore: String(coverageScore),
      canaryStatuses,
      notes: [],
    })
    .onConflictDoUpdate({
      target: dailySnapshots.date,
      set: {
        axisScores,
        signalIds,
        coverageScore: String(coverageScore),
        canaryStatuses,
        notes: [],
      },
    });

  return {
    created: true,
    signalCount: todayRows.length,
  };
}
