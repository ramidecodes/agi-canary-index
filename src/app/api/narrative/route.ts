/**
 * GET /api/narrative
 * Returns a template-based narrative summary of the current AI state.
 * No LLM call needed — generated from snapshot data.
 */

import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailySnapshots } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const AXIS_LABELS: Record<string, string> = {
  reasoning: "reasoning",
  learning_efficiency: "learning efficiency",
  long_term_memory: "long-term memory",
  planning: "planning",
  tool_use: "tool use",
  social_cognition: "social cognition",
  multimodal_perception: "multimodal perception",
  robustness: "robustness",
  alignment_safety: "alignment & safety",
};

interface AxisEntry {
  score?: number;
  delta?: number;
  signalCount?: number;
}

export async function GET() {
  try {
    const db = getDb();
    const [latest] = await db
      .select()
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(1);

    if (!latest || !latest.axisScores) {
      return NextResponse.json({
        headline: "Awaiting first data collection.",
        summary:
          "No snapshot data is available yet. The pipeline needs to run to generate the first daily snapshot.",
        date: null,
      });
    }

    const scores = latest.axisScores as Record<string, AxisEntry>;

    // Categorize axes by movement direction
    const advancing: { axis: string; delta: number }[] = [];
    const declining: { axis: string; delta: number }[] = [];
    const stable: string[] = [];
    const noData: string[] = [];

    for (const [axis, entry] of Object.entries(scores)) {
      const delta = entry?.delta ?? 0;
      const signalCount = entry?.signalCount ?? 0;

      if (signalCount === 0 && Math.abs(entry?.score ?? 0) < 0.01) {
        noData.push(axis);
      } else if (Math.abs(delta) < 0.02) {
        stable.push(axis);
      } else if (delta > 0) {
        advancing.push({ axis, delta });
      } else {
        declining.push({ axis, delta });
      }
    }

    // Sort by magnitude
    advancing.sort((a, b) => b.delta - a.delta);
    declining.sort((a, b) => a.delta - b.delta);

    // Build headline
    let trendWord: string;
    if (advancing.length > declining.length + 1) trendWord = "advancing";
    else if (declining.length > advancing.length + 1) trendWord = "declining";
    else if (advancing.length > 0 && declining.length > 0) trendWord = "mixed";
    else trendWord = "holding steady";

    const topMover =
      advancing.length > 0
        ? (AXIS_LABELS[advancing[0].axis] ?? advancing[0].axis)
        : declining.length > 0
          ? (AXIS_LABELS[declining[0].axis] ?? declining[0].axis)
          : null;

    const headline = topMover
      ? `AI capabilities are ${trendWord} this week, with notable movement in ${topMover}.`
      : `AI capabilities are ${trendWord} this week.`;

    // Build 2-3 sentence summary
    const parts: string[] = [];

    if (advancing.length > 0) {
      const names = advancing
        .slice(0, 3)
        .map((a) => AXIS_LABELS[a.axis] ?? a.axis);
      parts.push(
        `${advancing.length} ${advancing.length === 1 ? "axis" : "axes"} showed improvement${names.length > 0 ? ` (${names.join(", ")})` : ""}.`,
      );
    }

    if (declining.length > 0) {
      const names = declining
        .slice(0, 2)
        .map((a) => AXIS_LABELS[a.axis] ?? a.axis);
      parts.push(
        `${declining.length} ${declining.length === 1 ? "axis" : "axes"} declined${names.length > 0 ? ` (${names.join(", ")})` : ""}.`,
      );
    }

    if (stable.length > 0) {
      parts.push(`${stable.length} remained stable.`);
    }

    if (noData.length > 0) {
      parts.push(
        `${noData.length} ${noData.length === 1 ? "axis has" : "axes have"} insufficient data.`,
      );
    }

    const summary = parts.join(" ");

    // Summary counts for display
    const summaryLine = `Today: ${advancing.length} ${advancing.length === 1 ? "axis" : "axes"} advanced, ${declining.length} declined, ${stable.length} stable${noData.length > 0 ? `, ${noData.length} no data` : ""}.`;

    return NextResponse.json({
      headline,
      summary,
      summaryLine,
      date: latest.date,
      counts: {
        advancing: advancing.length,
        declining: declining.length,
        stable: stable.length,
        noData: noData.length,
      },
      topMovers: {
        advancing: advancing.slice(0, 3).map((a) => ({
          axis: a.axis,
          label: AXIS_LABELS[a.axis] ?? a.axis,
          delta: a.delta,
        })),
        declining: declining.slice(0, 3).map((a) => ({
          axis: a.axis,
          label: AXIS_LABELS[a.axis] ?? a.axis,
          delta: a.delta,
        })),
      },
    });
  } catch (err) {
    console.error("[api/narrative]", err);
    return NextResponse.json(
      { error: "Failed to generate narrative" },
      { status: 500 },
    );
  }
}
