/**
 * POST /api/admin/sources/validate
 * Validates all active sources by performing lightweight HEAD/GET requests.
 * Updates errorCount and lastSuccessAt based on results.
 * @see docs/features/02-source-registry.md
 */

import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sources } from "@/lib/db/schema";
import { AUTO_DISABLE_FAILURE_THRESHOLD } from "@/lib/sources";

export const dynamic = "force-dynamic";

/** Timeout for each source validation request (ms). */
const VALIDATION_TIMEOUT = 15_000;

interface ValidationResult {
  sourceId: string;
  sourceName: string;
  url: string;
  ok: boolean;
  statusCode?: number;
  error?: string;
  durationMs: number;
}

async function validateSource(
  source: { id: string; name: string; url: string; sourceType: string },
): Promise<ValidationResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT);

  try {
    // For search sources, skip HTTP validation (they use API calls)
    if (source.sourceType === "search") {
      return {
        sourceId: source.id,
        sourceName: source.name,
        url: source.url,
        ok: true,
        durationMs: Date.now() - start,
      };
    }

    // Try HEAD first, fall back to GET with small body
    const method = "HEAD";
    const res = await fetch(source.url, {
      method,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "AGI-Canary-Watcher/1.0 (source-validator)",
      },
    });

    return {
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      ok: res.ok || res.status === 403 || res.status === 405,
      statusCode: res.status,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      sourceId: source.id,
      sourceName: source.name,
      url: source.url,
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
      durationMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST() {
  const authRes = await requireAuth();
  if (authRes) return authRes;

  try {
    const db = getDb();

    // Get all active sources
    const activeSources = await db
      .select({
        id: sources.id,
        name: sources.name,
        url: sources.url,
        sourceType: sources.sourceType,
      })
      .from(sources)
      .where(eq(sources.isActive, true));

    // Validate sources in parallel (batches of 5 to avoid overwhelming)
    const results: ValidationResult[] = [];
    const batchSize = 5;

    for (let i = 0; i < activeSources.length; i += batchSize) {
      const batch = activeSources.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((s) => validateSource(s)),
      );
      results.push(...batchResults);
    }

    // Update source health based on results
    let autoDisabled = 0;

    for (const result of results) {
      if (result.ok) {
        // Reset error count and update last success
        await db
          .update(sources)
          .set({
            errorCount: 0,
            lastSuccessAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(sources.id, result.sourceId));
      } else {
        // Increment error count
        await db
          .update(sources)
          .set({
            errorCount: sql`${sources.errorCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(sources.id, result.sourceId));

        // Check if we should auto-disable
        const [src] = await db
          .select({ errorCount: sources.errorCount })
          .from(sources)
          .where(eq(sources.id, result.sourceId));

        if (src && src.errorCount >= AUTO_DISABLE_FAILURE_THRESHOLD) {
          await db
            .update(sources)
            .set({ isActive: false, updatedAt: new Date() })
            .where(
              and(
                eq(sources.id, result.sourceId),
                eq(sources.isActive, true),
              ),
            );
          autoDisabled++;
        }
      }
    }

    const passing = results.filter((r) => r.ok).length;
    const failing = results.filter((r) => !r.ok).length;

    return NextResponse.json({
      validated: results.length,
      passing,
      failing,
      autoDisabled,
      results: results.map((r) => ({
        sourceId: r.sourceId,
        name: r.sourceName,
        ok: r.ok,
        statusCode: r.statusCode,
        error: r.error,
        durationMs: r.durationMs,
      })),
    });
  } catch (err) {
    console.error("[api/admin/sources/validate] POST error:", err);
    return NextResponse.json(
      { error: "Failed to validate sources" },
      { status: 500 },
    );
  }
}
