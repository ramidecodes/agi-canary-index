/**
 * News articles query: processed documents with primary signal (why it matters).
 * @see docs/features/11-daily-brief.md
 */

import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { documents, items, signals, sources } from "@/lib/db/schema";
import type { getDb } from "@/lib/db";
import { AXES } from "@/lib/signal/schemas";
import type { NewsArticle } from "@/lib/brief/types";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_TIERS = ["TIER_0", "TIER_1", "DISCOVERY"] as const;

export interface NewsQueryParams {
  limit?: number;
  cursor?: string;
  dateFrom?: string;
  dateTo?: string;
  axis?: string;
  sourceTier?: string;
}

/** Cursor = base64(createdAt + ":" + signalId) for next page. */
export async function queryNews(
  db: ReturnType<typeof getDb>,
  params: NewsQueryParams,
): Promise<{ articles: NewsArticle[]; nextCursor: string | null }> {
  const limit = Math.min(params.limit ?? 20, 50);
  const conditions: SQL[] = [];

  if (params.dateFrom && DATE_REGEX.test(params.dateFrom)) {
    conditions.push(
      gte(signals.createdAt, new Date(`${params.dateFrom}T00:00:00Z`)),
    );
  }
  if (params.dateTo && DATE_REGEX.test(params.dateTo)) {
    conditions.push(
      lte(signals.createdAt, new Date(`${params.dateTo}T23:59:59.999Z`)),
    );
  }
  if (
    params.sourceTier &&
    VALID_TIERS.includes(params.sourceTier as (typeof VALID_TIERS)[number])
  ) {
    conditions.push(
      eq(sources.tier, params.sourceTier as "TIER_0" | "TIER_1" | "DISCOVERY"),
    );
  }
  if (params.axis && AXES.includes(params.axis as (typeof AXES)[number])) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM jsonb_array_elements(${signals.axesImpacted}) AS elem WHERE elem->>'axis' = ${params.axis})`,
    );
  }

  let cursorDate: Date | null = null;
  let cursorId: string | null = null;
  if (params.cursor) {
    try {
      const decoded = Buffer.from(params.cursor, "base64").toString("utf8");
      const [dateStr, id] = decoded.split(":");
      if (dateStr && id) {
        cursorDate = new Date(dateStr);
        cursorId = id;
      }
    } catch {
      // ignore invalid cursor
    }
  }
  if (cursorDate && cursorId) {
    conditions.push(
      sql`(${signals.createdAt} < ${cursorDate} OR (${signals.createdAt} = ${cursorDate} AND ${signals.id} < ${cursorId}))`,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const orderBy = desc(signals.createdAt);
  const fetchLimit = Math.min(limit * 8, 400);

  const rows = await db
    .select({
      id: signals.id,
      claimSummary: signals.claimSummary,
      axesImpacted: signals.axesImpacted,
      confidence: signals.confidence,
      createdAt: signals.createdAt,
      documentId: signals.documentId,
      metric: signals.metric,
      itemTitle: items.title,
      itemUrl: items.url,
      publishedAt: items.publishedAt,
      sourceName: sources.name,
      sourceTier: sources.tier,
      domainType: sources.domainType,
      extractedMetadata: documents.extractedMetadata,
    })
    .from(signals)
    .innerJoin(documents, eq(signals.documentId, documents.id))
    .innerJoin(items, eq(documents.itemId, items.id))
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .where(whereClause)
    .orderBy(orderBy)
    .limit(fetchLimit);

  type DocMetadata = { title?: string; sourceURL?: string } | null;
  const resolveTitle = (meta: DocMetadata, itemTitle: string | null) =>
    (meta?.title?.trim() || itemTitle) ?? null;
  const resolveUrl = (meta: DocMetadata, itemUrl: string) =>
    meta?.sourceURL?.trim() || itemUrl;

  const byDocument = new Map<
    string,
    {
      documentId: string;
      title: string | null;
      url: string | null;
      sourceName: string | null;
      sourceTier: string | null;
      publishedAt: Date | string | null;
      domainType: string | null;
      best: {
        id: string;
        claimSummary: string;
        confidence: number;
        createdAt: Date | string;
        hasMetric: boolean;
      };
    }
  >();

  for (const r of rows) {
    const docId = r.documentId;
    const existing = byDocument.get(docId);
    const confidence = Number(r.confidence) || 0;
    const hasMetric = r.metric != null;
    const meta = (r.extractedMetadata ?? null) as DocMetadata;
    if (!existing || confidence > existing.best.confidence) {
      byDocument.set(docId, {
        documentId: docId,
        title: resolveTitle(meta, r.itemTitle),
        url: resolveUrl(meta, r.itemUrl),
        sourceName: r.sourceName ?? null,
        sourceTier: r.sourceTier ?? null,
        publishedAt: r.publishedAt ?? null,
        domainType: r.domainType ?? null,
        best: {
          id: r.id,
          claimSummary: r.claimSummary ?? "",
          confidence,
          createdAt: r.createdAt,
          hasMetric,
        },
      });
    }
  }

  const sorted = [...byDocument.entries()].sort((a, b) => {
    const ta =
      a[1].best.createdAt instanceof Date
        ? a[1].best.createdAt.getTime()
        : new Date(a[1].best.createdAt).getTime();
    const tb =
      b[1].best.createdAt instanceof Date
        ? b[1].best.createdAt.getTime()
        : new Date(b[1].best.createdAt).getTime();
    return tb - ta;
  });

  const articles: NewsArticle[] = sorted.slice(0, limit).map(([, v]) => ({
    id: v.documentId,
    documentId: v.documentId,
    title: v.title,
    url: v.url,
    sourceName: v.sourceName,
    sourceTier: v.sourceTier,
    publishedAt:
      v.publishedAt instanceof Date
        ? v.publishedAt.toISOString()
        : v.publishedAt,
    tags: [
      v.domainType ?? "research",
      v.best.hasMetric ? "benchmark" : "claim",
    ].filter(Boolean),
    whyItMatters: v.best.claimSummary || null,
    confidence: v.best.confidence,
    signalId: v.best.id,
    createdAt:
      v.best.createdAt instanceof Date
        ? v.best.createdAt.toISOString()
        : String(v.best.createdAt),
  }));

  const nextEntry = sorted[limit];
  const nextCursor = nextEntry
    ? Buffer.from(
        `${
          nextEntry[1].best.createdAt instanceof Date
            ? nextEntry[1].best.createdAt.toISOString()
            : nextEntry[1].best.createdAt
        }:${nextEntry[1].best.id}`,
      ).toString("base64")
    : null;

  return { articles, nextCursor };
}
