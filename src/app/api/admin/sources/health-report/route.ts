/**
 * GET /api/admin/sources/health-report
 * Returns source health report grouped by status with suggestions.
 * @see docs/features/02-source-registry.md
 */

import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sources, sourceFetchLogs } from "@/lib/db/schema";
import {
  getSourceHealthStatus,
  AUTO_DISABLE_FAILURE_THRESHOLD,
  type SourceHealthStatus,
} from "@/lib/sources";

export const dynamic = "force-dynamic";

export async function GET() {
  const authRes = await requireAuth();
  if (authRes) return authRes;

  try {
    const db = getDb();
    const allSources = await db
      .select()
      .from(sources)
      .orderBy(sources.name);

    const grouped: Record<
      SourceHealthStatus,
      Array<{
        id: string;
        name: string;
        url: string;
        tier: string;
        isActive: boolean;
        errorCount: number;
        lastSuccessAt: string | null;
        daysSinceSuccess: number | null;
        lastError: string | null;
        status: SourceHealthStatus;
      }>
    > = { green: [], yellow: [], red: [] };

    const suggestions: string[] = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (const src of allSources) {
      const status = getSourceHealthStatus(src);
      const daysSinceSuccess = src.lastSuccessAt
        ? Math.floor((now - new Date(src.lastSuccessAt).getTime()) / dayMs)
        : null;

      // Get the last error message if there are errors
      let lastError: string | null = null;
      if (src.errorCount > 0) {
        const [lastLog] = await db
          .select({ errorMessage: sourceFetchLogs.errorMessage })
          .from(sourceFetchLogs)
          .where(eq(sourceFetchLogs.sourceId, src.id))
          .orderBy(desc(sourceFetchLogs.fetchedAt))
          .limit(1);
        lastError = lastLog?.errorMessage ?? null;
      }

      grouped[status].push({
        id: src.id,
        name: src.name,
        url: src.url,
        tier: src.tier,
        isActive: src.isActive,
        errorCount: src.errorCount,
        lastSuccessAt: src.lastSuccessAt?.toISOString() ?? null,
        daysSinceSuccess,
        lastError,
        status,
      });

      // Generate suggestions
      if (
        status === "red" &&
        src.isActive &&
        src.errorCount >= AUTO_DISABLE_FAILURE_THRESHOLD
      ) {
        suggestions.push(
          `Auto-disable "${src.name}" — ${src.errorCount} consecutive failures.`,
        );
      }
      if (daysSinceSuccess !== null && daysSinceSuccess > 14 && src.isActive) {
        suggestions.push(
          `"${src.name}" has not succeeded in ${daysSinceSuccess} days. Consider disabling or investigating.`,
        );
      }
    }

    const active = allSources.filter((s) => s.isActive);
    const activeGreen = grouped.green.filter((s) => s.isActive).length;
    const healthScore =
      active.length > 0
        ? Math.round((activeGreen / active.length) * 100)
        : 0;

    return NextResponse.json({
      summary: {
        total: allSources.length,
        active: active.length,
        green: grouped.green.length,
        yellow: grouped.yellow.length,
        red: grouped.red.length,
        healthScore,
      },
      sources: grouped,
      suggestions,
    });
  } catch (err) {
    console.error("[api/admin/sources/health-report] GET error:", err);
    return NextResponse.json(
      { error: "Failed to generate health report" },
      { status: 500 },
    );
  }
}
