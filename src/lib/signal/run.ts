/**
 * Signal processing pipeline orchestration.
 * Processes acquired documents: fetch from R2, AI extraction, create signals, mark processed.
 * @see docs/features/05-signal-processing.md
 */

import { APICallError } from "ai";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { documents, items, signals, sources } from "@/lib/db/schema";
import type { createDb } from "@/lib/db";
import { fetchDocumentFromR2 } from "@/lib/r2";
import { extractSignals } from "./extract";
import type { ExtractedClaim } from "./schemas";

const BATCH_SIZE = 10;
const CONCURRENCY = 4;
const CONFIDENCE_THRESHOLD = 0.3;
const DEFAULT_SCORING_VERSION = "v1";

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "...";
}

function formatSignalError(err: unknown): string {
  if (APICallError.isInstance(err)) {
    const parts = [err.message];
    if (err.statusCode != null) parts.push(`status=${err.statusCode}`);
    const body =
      typeof err.responseBody === "string"
        ? err.responseBody
        : typeof err.responseBody === "object" && err.responseBody != null
        ? JSON.stringify(err.responseBody)
        : "";
    if (body) {
      const parsed = safeParseJson(body) as {
        error?: { message?: string; error?: { message?: string } };
      } | null;
      const msg =
        parsed?.error?.message ?? parsed?.error?.error?.message ?? body;
      parts.push(truncate(String(msg), 200));
    }
    return parts.join(" | ");
  }
  return err instanceof Error ? err.message : "Signal processing failed";
}

function safeParseJson(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface SignalProcessingContext {
  db: ReturnType<typeof createDb>;
  r2BucketName: string;
  openRouterApiKey: string;
}

export interface SignalProcessingOptions {
  /** Process only these document IDs; if not set, fetches next batch of acquired docs */
  documentIds?: string[];
}

export interface ProcessedDocumentResult {
  documentId: string;
  itemId: string;
  runId: string;
  success: boolean;
  signalsCreated: number;
  error?: string;
}

export interface SignalProcessingStats {
  documentsProcessed: number;
  documentsFailed: number;
  signalsCreated: number;
  durationMs: number;
  perDocument: ProcessedDocumentResult[];
}

interface AcquiredDocRow {
  documentId: string;
  itemId: string;
  runId: string;
  cleanBlobKey: string;
  sourceName: string;
  tier: string;
  trustWeight: string;
  publishedAt: Date | null;
}

const ACQUIRED_DOC_SELECT = {
  documentId: documents.id,
  itemId: documents.itemId,
  runId: items.runId,
  cleanBlobKey: documents.cleanBlobKey,
  sourceName: sources.name,
  tier: sources.tier,
  trustWeight: sources.trustWeight,
  publishedAt: items.publishedAt,
};

/**
 * Fetch acquired, unprocessed documents. When documentIds provided, returns those;
 * otherwise returns next batch ordered by tier and acquiredAt (Tier-0 first).
 */
async function getAcquiredDocuments(
  db: ReturnType<typeof createDb>,
  limit: number,
  documentIds?: string[]
): Promise<AcquiredDocRow[]> {
  const baseConditions = [
    isNull(documents.processedAt),
    isNotNull(documents.cleanBlobKey),
    eq(items.status, "acquired"),
  ];
  const whereClause = documentIds?.length
    ? and(...baseConditions, inArray(documents.id, documentIds))
    : and(...baseConditions);

  const baseQuery = db
    .select(ACQUIRED_DOC_SELECT)
    .from(documents)
    .innerJoin(items, eq(documents.itemId, items.id))
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .where(whereClause);

  const orderedQuery = documentIds?.length
    ? baseQuery
    : baseQuery.orderBy(sources.tier, documents.acquiredAt);

  const rows = await orderedQuery.limit(limit);
  return rows as AcquiredDocRow[];
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, Number(n) || 0));
}

function adjustedConfidence(
  claimConfidence: number,
  trustWeight: string
): number {
  const weight = Number(trustWeight) || 1;
  return clamp01(claimConfidence * weight);
}

function mapClaimToSignalRow(
  documentId: string,
  claim: ExtractedClaim,
  trustWeight: string,
  scoringVersion: string
): {
  documentId: string;
  claimSummary: string;
  axesImpacted: Array<{
    axis: string;
    direction: string;
    magnitude: number;
    uncertainty?: number;
  }>;
  metric: { name: string; value: number; unit?: string } | null;
  confidence: string;
  citations: Array<{ url: string; quoted_span?: string }>;
  scoringVersion: string;
} | null {
  const conf = adjustedConfidence(claim.confidence, trustWeight);
  if (conf < CONFIDENCE_THRESHOLD) return null;
  if (!claim.axes_impacted?.length) return null;

  const citations = (claim.citations ?? []).map((c) => ({
    url: c.url ?? "",
    quoted_span: c.text,
  }));

  return {
    documentId,
    claimSummary: claim.claim_summary,
    axesImpacted: claim.axes_impacted.map((a) => ({
      axis: a.axis,
      direction: a.direction,
      magnitude: clamp01(a.magnitude),
      uncertainty: clamp01(a.uncertainty ?? 0.5),
    })),
    metric: claim.benchmark
      ? {
          name: claim.benchmark.name,
          value: claim.benchmark.value,
          unit: claim.benchmark.unit,
        }
      : null,
    confidence: String(Number(conf.toFixed(2))),
    citations,
    scoringVersion,
  };
}

async function processOneDocument(
  ctx: SignalProcessingContext,
  row: AcquiredDocRow,
  scoringVersion: string
): Promise<ProcessedDocumentResult> {
  const { db, r2BucketName, openRouterApiKey } = ctx;
  const result: ProcessedDocumentResult = {
    documentId: row.documentId,
    itemId: row.itemId,
    runId: row.runId,
    success: false,
    signalsCreated: 0,
  };

  try {
    const content = await fetchDocumentFromR2({
      bucketName: r2BucketName,
      key: row.cleanBlobKey,
    });

    if (!content) {
      result.error = "Content not found in R2";
      return result;
    }

    const extraction = await extractSignals(
      content,
      {
        sourceName: row.sourceName,
        tier: row.tier,
        publishedDate: row.publishedAt
          ? new Date(row.publishedAt).toISOString().slice(0, 10)
          : null,
      },
      openRouterApiKey
    );

    let created = 0;
    for (const claim of extraction.claims ?? []) {
      const signalRow = mapClaimToSignalRow(
        row.documentId,
        claim,
        row.trustWeight,
        scoringVersion
      );
      if (!signalRow) continue;
      await db.insert(signals).values({
        documentId: signalRow.documentId,
        claimSummary: signalRow.claimSummary,
        axesImpacted: signalRow.axesImpacted,
        metric: signalRow.metric,
        confidence: signalRow.confidence,
        citations: signalRow.citations,
        scoringVersion: signalRow.scoringVersion,
      });
      created++;
    }

    await db
      .update(documents)
      .set({ processedAt: new Date() })
      .where(eq(documents.id, row.documentId));
    await db
      .update(items)
      .set({ status: "processed" })
      .where(eq(items.id, row.itemId));

    result.success = true;
    result.signalsCreated = created;
  } catch (err) {
    result.error = formatSignalError(err);
    if (APICallError.isInstance(err)) {
      console.error("[signal/run] APICallError:", {
        documentId: row.documentId,
        statusCode: err.statusCode,
        responseBody: truncate(String(err.responseBody ?? ""), 800),
        cause: err.cause,
      });
    }
  }

  return result;
}

/**
 * Run signal processing: fetch acquired documents, extract signals via AI, persist, mark processed.
 * Processes documents in parallel (CONCURRENCY=4) to improve throughput.
 */
export async function runSignalProcessing(
  ctx: SignalProcessingContext,
  options: SignalProcessingOptions = {}
): Promise<SignalProcessingStats> {
  const { db } = ctx;
  const startMs = Date.now();
  const stats: SignalProcessingStats = {
    documentsProcessed: 0,
    documentsFailed: 0,
    signalsCreated: 0,
    durationMs: 0,
    perDocument: [],
  };

  const scoringVersion = DEFAULT_SCORING_VERSION;
  const batch = await getAcquiredDocuments(db, BATCH_SIZE, options.documentIds);

  if (batch.length === 0) {
    stats.durationMs = Date.now() - startMs;
    return stats;
  }

  console.log(
    JSON.stringify({
      event: "signal_processing_start",
      documentCount: batch.length,
    })
  );

  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    const chunk = batch.slice(i, i + CONCURRENCY);
    const chunkIndex = Math.floor(i / CONCURRENCY) + 1;

    const chunkResults = await Promise.all(
      chunk.map((row) => processOneDocument(ctx, row, scoringVersion))
    );

    for (const result of chunkResults) {
      stats.perDocument.push(result);
      if (result.success) {
        stats.documentsProcessed++;
        stats.signalsCreated += result.signalsCreated;
      } else {
        stats.documentsFailed++;
      }
    }

    const elapsedMs = Date.now() - startMs;
    console.log(
      JSON.stringify({
        event: "signal_processing_chunk_complete",
        chunkIndex,
        chunkSize: chunk.length,
        documentsProcessed: stats.documentsProcessed,
        documentsFailed: stats.documentsFailed,
        signalsCreated: stats.signalsCreated,
        elapsedMs,
      })
    );
  }

  stats.durationMs = Date.now() - startMs;
  console.log(
    JSON.stringify({
      event: "signal_processing_completed",
      documentsProcessed: stats.documentsProcessed,
      documentsFailed: stats.documentsFailed,
      signalsCreated: stats.signalsCreated,
      durationMs: stats.durationMs,
    })
  );
  return stats;
}
