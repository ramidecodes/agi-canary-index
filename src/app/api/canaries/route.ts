/**
 * GET /api/canaries
 * Returns canary definitions with computed status from latest snapshot.
 */

import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { canaryDefinitions, dailySnapshots } from "@/lib/db/schema";

/** Derive canary status from axis scores. Returns green | yellow | red | gray */
function deriveCanaryStatus(
  axesWatched: string[] | null,
  axisScores: Record<string, { score?: number; uncertainty?: number }> | null,
  snapshotStatuses: Array<{
    canary_id: string;
    status: string;
    last_change?: string;
    confidence?: number;
  }> | null,
  canaryId: string,
): {
  status: "green" | "yellow" | "red" | "gray";
  lastChange?: string;
  confidence?: number;
} {
  const match = snapshotStatuses?.find((s) => s.canary_id === canaryId);
  if (match?.status && ["green", "yellow", "red"].includes(match.status)) {
    return {
      status: match.status as "green" | "yellow" | "red",
      lastChange: match.last_change,
      confidence: match.confidence,
    };
  }

  if (!axesWatched?.length || !axisScores) {
    return { status: "gray" };
  }

  let sum = 0;
  let count = 0;
  for (const axis of axesWatched) {
    const entry = axisScores[axis];
    if (entry?.score != null) {
      const normalized = (Number(entry.score) + 1) / 2;
      sum += normalized;
      count++;
    }
  }
  const level = count > 0 ? sum / count : 0;

  if (level >= 0.6) return { status: "green" };
  if (level >= 0.3) return { status: "yellow" };
  if (level > 0) return { status: "red" };
  return { status: "gray" };
}

/** Risk-related canary IDs for autonomy page filter. */
const RISK_CANARY_IDS = new Set([
  "long_horizon",
  "self_improvement",
  "economic_impact",
  "alignment_coverage",
  "deception",
  "tool_creation",
]);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const typeFilter = searchParams.get("type");
  try {
    const db = getDb();

    const [latest] = await db
      .select()
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(1);

    let definitions = await db
      .select()
      .from(canaryDefinitions)
      .where(eq(canaryDefinitions.isActive, true))
      .orderBy(asc(canaryDefinitions.displayOrder));

    if (typeFilter === "risk") {
      definitions = definitions.filter((d) => RISK_CANARY_IDS.has(d.id));
    }

    const axisScores = latest?.axisScores ?? null;
    const canaryStatuses = latest?.canaryStatuses ?? null;

    const canaries = definitions.map((d) => {
      const derived = deriveCanaryStatus(
        d.axesWatched as string[] | null,
        axisScores,
        canaryStatuses as Array<{
          canary_id: string;
          status: string;
          last_change?: string;
          confidence?: number;
        }> | null,
        d.id,
      );
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        axesWatched: d.axesWatched ?? [],
        thresholds: d.thresholds ?? {},
        displayOrder: d.displayOrder,
        status: derived.status,
        lastChange: derived.lastChange,
        confidence: derived.confidence,
      };
    });

    return NextResponse.json({ canaries });
  } catch (err) {
    console.error("[api/canaries]", err);
    return NextResponse.json(
      { error: "Failed to fetch canaries" },
      { status: 500 },
    );
  }
}
