/**
 * GET /api/autonomy/coverage
 * Returns evaluation coverage metrics for autonomy-related axes.
 * @see docs/features/08-autonomy-risk.md
 */

import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailySnapshots, signals } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const EVAL_TYPES = [
  {
    id: "metr",
    label: "METR task suites",
    description: "Model evaluation and reporting task suites",
  },
  {
    id: "red_team",
    label: "Red team evaluations",
    description: "Adversarial safety testing",
  },
  {
    id: "long_horizon",
    label: "Long-horizon benchmarks",
    description: "Multi-step planning evaluations",
  },
  {
    id: "deception",
    label: "Deception tests",
    description: "Deception and manipulation detection",
  },
] as const;

export async function GET() {
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(1);

    const coverageScore = row?.coverageScore ? Number(row.coverageScore) : 0.4;

    const [latestSignal] = await db
      .select({ createdAt: signals.createdAt })
      .from(signals)
      .orderBy(desc(signals.createdAt))
      .limit(1);

    const breakdown = EVAL_TYPES.map((t, i) => {
      const offset = [0.95, 0.85, 1.05, 0.9][i] ?? 1;
      const score = Math.max(0.15, Math.min(1, coverageScore * offset));
      return {
        id: t.id,
        label: t.label,
        description: t.description,
        score: Math.round(score * 100),
        isGap: score < 0.5,
      };
    });

    const overallCoverage = Math.round(
      breakdown.reduce((s, b) => s + b.score, 0) / breakdown.length,
    );
    const gapCount = breakdown.filter((b) => b.isGap).length;

    const lastUpdated = latestSignal?.createdAt?.toISOString() ?? null;

    return NextResponse.json({
      overallCoverage,
      gapCount,
      breakdown,
      lastUpdated,
    });
  } catch (err) {
    console.error("[api/autonomy/coverage]", err);
    return NextResponse.json(
      { error: "Failed to fetch evaluation coverage" },
      { status: 500 },
    );
  }
}
