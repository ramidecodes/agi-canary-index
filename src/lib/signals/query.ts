/**
 * Shared query logic for signals API.
 * Used by capability profile (axis+date) and signal explorer (full filters).
 */

import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { documents, items, signals, sources } from "@/lib/db/schema";
import type { getDb } from "@/lib/db";
import { AXES } from "@/lib/signal/schemas";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_TIERS = ["TIER_0", "TIER_1", "DISCOVERY"] as const;

export interface SignalExplorerFilters {
  axes?: string[];
  dateFrom?: string;
  dateTo?: string;
  sourceTier?: string;
  sourceId?: string;
  confidenceMin?: number;
  hasBenchmark?: boolean;
  q?: string;
  sort?: "createdAt" | "confidence";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface SignalExplorerResult {
  id: string;
  claimSummary: string;
  axesImpacted: Array<{
    axis: string;
    direction: string;
    magnitude: number;
    uncertainty?: number;
  }> | null;
  metric: { name: string; value: number; unit?: string } | null;
  confidence: number;
  createdAt: string;
  documentId: string;
  title: string | null;
  url: string | null;
  sourceId: string | null;
  sourceName: string | null;
  sourceTier: string | null;
  sourceUrl: string | null;
  classification: "benchmark" | "claim";
}

export function parseExplorerFilters(
  searchParams: URLSearchParams,
): SignalExplorerFilters {
  const axesParam = searchParams.get("axes");
  const axes =
    axesParam && axesParam.length > 0
      ? axesParam
          .split(",")
          .filter((a) => AXES.includes(a as (typeof AXES)[number]))
      : undefined;
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;
  const sourceTier = searchParams.get("sourceTier") ?? undefined;
  if (
    sourceTier &&
    !VALID_TIERS.includes(sourceTier as (typeof VALID_TIERS)[number])
  ) {
    // ignore invalid
  }
  const sourceId = searchParams.get("sourceId") ?? undefined;
  const confidenceMin = searchParams.get("confidenceMin");
  const hasBenchmarkParam = searchParams.get("hasBenchmark");
  const hasBenchmark =
    hasBenchmarkParam === "true"
      ? true
      : hasBenchmarkParam === "false"
        ? false
        : undefined;
  const q = (searchParams.get("q") ?? "").trim() || undefined;
  const sort = (searchParams.get("sort") ?? "createdAt") as
    | "createdAt"
    | "confidence";
  const order = (searchParams.get("order") ?? "desc") as "asc" | "desc";
  const limit = Math.min(
    Number.parseInt(searchParams.get("limit") ?? "100", 10),
    500,
  );
  const offset = Math.max(
    0,
    Number.parseInt(searchParams.get("offset") ?? "0", 10),
  );

  return {
    axes: axes?.length ? axes : undefined,
    dateFrom: dateFrom && DATE_REGEX.test(dateFrom) ? dateFrom : undefined,
    dateTo: dateTo && DATE_REGEX.test(dateTo) ? dateTo : undefined,
    sourceTier:
      sourceTier &&
      VALID_TIERS.includes(sourceTier as (typeof VALID_TIERS)[number])
        ? sourceTier
        : undefined,
    sourceId: sourceId || undefined,
    confidenceMin:
      confidenceMin != null
        ? Math.max(0, Math.min(1, Number.parseFloat(confidenceMin)))
        : undefined,
    hasBenchmark,
    q,
    sort: sort === "confidence" ? "confidence" : "createdAt",
    order: order === "asc" ? "asc" : "desc",
    limit,
    offset,
  };
}

/** Escape special chars for ILIKE pattern. */
function escapeIlikePattern(s: string): string {
  return s.replace(/[%_\\]/g, "\\$&");
}

export async function querySignalsExplorer(
  db: ReturnType<typeof getDb>,
  filters: SignalExplorerFilters,
): Promise<{ signals: SignalExplorerResult[]; total: number }> {
  const conditions: SQL[] = [];

  if (filters.sourceId) {
    conditions.push(eq(items.sourceId, filters.sourceId));
  }
  if (filters.sourceTier) {
    conditions.push(
      eq(sources.tier, filters.sourceTier as "TIER_0" | "TIER_1" | "DISCOVERY"),
    );
  }
  if (filters.confidenceMin != null) {
    conditions.push(
      sql`${signals.confidence} >= ${String(filters.confidenceMin)}`,
    );
  }
  if (filters.hasBenchmark === true) {
    conditions.push(sql`${signals.metric} IS NOT NULL`);
  } else if (filters.hasBenchmark === false) {
    conditions.push(sql`${signals.metric} IS NULL`);
  }
  if (filters.dateFrom) {
    conditions.push(
      gte(signals.createdAt, new Date(`${filters.dateFrom}T00:00:00Z`)),
    );
  }
  if (filters.dateTo) {
    conditions.push(
      lte(signals.createdAt, new Date(`${filters.dateTo}T23:59:59.999Z`)),
    );
  }
  if (filters.q) {
    conditions.push(
      ilike(signals.claimSummary, `%${escapeIlikePattern(filters.q)}%`),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderBy =
    filters.sort === "confidence"
      ? filters.order === "asc"
        ? asc(signals.confidence)
        : desc(signals.confidence)
      : filters.order === "asc"
        ? asc(signals.createdAt)
        : desc(signals.createdAt);

  // When filtering by axes we filter in-memory, so fetch extra to compensate
  const fetchLimit =
    filters.axes?.length && filters.axes.length > 0
      ? Math.min((filters.limit ?? 100) * 3, 1000)
      : (filters.limit ?? 100);

  // Fetch signals with document -> item -> source
  const rows = await db
    .select({
      id: signals.id,
      claimSummary: signals.claimSummary,
      axesImpacted: signals.axesImpacted,
      metric: signals.metric,
      confidence: signals.confidence,
      createdAt: signals.createdAt,
      documentId: signals.documentId,
      title: items.title,
      url: items.url,
      sourceId: sources.id,
      sourceName: sources.name,
      sourceTier: sources.tier,
      sourceUrl: sources.url,
    })
    .from(signals)
    .innerJoin(documents, eq(signals.documentId, documents.id))
    .innerJoin(items, eq(documents.itemId, items.id))
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .where(whereClause)
    .orderBy(orderBy)
    .limit(fetchLimit)
    .offset(filters.offset ?? 0);

  // Filter by axes in memory (JSONB array contains check is awkward in SQL)
  let filtered = rows;
  if (filters.axes && filters.axes.length > 0) {
    filtered = rows.filter((r) => {
      const axes = r.axesImpacted as Array<{ axis: string }> | null;
      return axes?.some((a) => filters.axes?.includes(a.axis)) ?? false;
    });
  }
  filtered = filtered.slice(0, filters.limit ?? 100);

  const results: SignalExplorerResult[] = filtered.map((r) => ({
    id: r.id,
    claimSummary: r.claimSummary,
    axesImpacted: r.axesImpacted as SignalExplorerResult["axesImpacted"],
    metric: r.metric as SignalExplorerResult["metric"],
    confidence: Number(r.confidence),
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt ?? ""),
    documentId: r.documentId,
    title: r.title ?? null,
    url: r.url ?? null,
    sourceId: r.sourceId ?? null,
    sourceName: r.sourceName ?? null,
    sourceTier: r.sourceTier ?? null,
    sourceUrl: r.sourceUrl ?? null,
    classification: r.metric != null ? "benchmark" : "claim",
  }));

  // Total count (approximate for pagination - we'd need a separate count query for exact)
  const total = results.length + (filters.offset ?? 0);
  return { signals: results, total };
}
