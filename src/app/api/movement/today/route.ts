/**
 * GET /api/movement/today
 * Returns today's significant changes (from signals or last snapshot).
 */

import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailySnapshots, signals } from "@/lib/db/schema";
import { AXES } from "@/lib/signal/schemas";

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

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    const [snapshot] = await db
      .select()
      .from(dailySnapshots)
      .where(sql`${dailySnapshots.date}::date = ${today}::date`)
      .limit(1);

    const movements: Array<{
      axis: string;
      label: string;
      direction: "up" | "down" | "neutral";
      delta: number;
      source?: string;
    }> = [];

    if (snapshot?.axisScores) {
      const scores = snapshot.axisScores as Record<
        string,
        { score?: number; uncertainty?: number; delta?: number }
      >;
      for (const axis of AXES) {
        const entry = scores[axis];
        if (!entry) continue;
        const delta = entry.delta ?? 0;
        const direction: "up" | "down" | "neutral" =
          delta > 0.01 ? "up" : delta < -0.01 ? "down" : "neutral";
        movements.push({
          axis,
          label: AXIS_LABELS[axis] ?? axis,
          direction,
          delta,
          source: "daily snapshot",
        });
      }
    }

    if (movements.length === 0) {
      const recentSignals = await db
        .select({
          axesImpacted: signals.axesImpacted,
          claimSummary: signals.claimSummary,
        })
        .from(signals)
        .where(sql`${signals.createdAt}::date = ${today}::date`)
        .orderBy(desc(signals.createdAt))
        .limit(20);

      const seen = new Set<string>();
      for (const s of recentSignals) {
        const axes = (s.axesImpacted ?? []) as Array<{
          axis: string;
          direction: string;
          magnitude: number;
        }>;
        for (const a of axes) {
          if (seen.has(a.axis)) continue;
          seen.add(a.axis);
          const direction =
            a.direction === "up"
              ? "up"
              : a.direction === "down"
                ? "down"
                : "neutral";
          movements.push({
            axis: a.axis,
            label: AXIS_LABELS[a.axis] ?? a.axis,
            direction,
            delta:
              direction === "up"
                ? a.magnitude
                : direction === "down"
                  ? -a.magnitude
                  : 0,
            source: s.claimSummary?.slice(0, 80),
          });
        }
      }
    }

    movements.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const top = movements.slice(0, 5);

    return NextResponse.json({
      movements: top,
      date: today,
    });
  } catch (err) {
    console.error("[api/movement/today]", err);
    return NextResponse.json(
      { error: "Failed to fetch today's movement" },
      { status: 500 },
    );
  }
}
