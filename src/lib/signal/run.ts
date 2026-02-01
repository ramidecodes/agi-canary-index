/**
 * Signal processing pipeline orchestration.
 * Processes acquired documents: fetch from R2, AI extraction, create signals, mark processed.
 * @see docs/features/05-signal-processing.md
 */

import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { documents, items, signals, sources } from "@/lib/db/schema";
import type { createDb } from "@/lib/db";
import { fetchDocumentFromR2 } from "@/lib/r2";
import { extractSignals } from "./extract";
import type { ExtractedClaim } from "./schemas";

const BATCH_SIZE = 10;
const CONFIDENCE_THRESHOLD = 0.3;
const DEFAULT_SCORING_VERSION = "v1";

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

/**
 * Fetch next batch of acquired, unprocessed documents (Tier-0 first).
 */
async function getAcquiredDocuments(
  db: ReturnType<typeof createDb>,
  limit: number,
  documentIds?: string[]
): Promise<AcquiredDocRow[]> {
  if (documentIds?.length) {
    const rows = await db
      .select({
        documentId: documents.id,
        itemId: documents.itemId,
        runId: items.runId,
        cleanBlobKey: documents.cleanBlobKey,
        sourceName: sources.name,
        tier: sources.tier,
        trustWeight: sources.trustWeight,
        publishedAt: items.publishedAt,
      })
      .from(documents)
      .innerJoin(items, eq(documents.itemId, items.id))
      .innerJoin(sources, eq(items.sourceId, sources.id))
      .where(
        and(
          isNull(documents.processedAt),
          isNotNull(documents.cleanBlobKey),
          eq(items.status, "acquired"),
          inArray(documents.id, documentIds)
        )
      )
      .limit(limit);
    return rows as AcquiredDocRow[];
  }

  const rows = await db
    .select({
      documentId: documents.id,
      itemId: documents.itemId,
      runId: items.runId,
      cleanBlobKey: documents.cleanBlobKey,
      sourceName: sources.name,
      tier: sources.tier,
      trustWeight: sources.trustWeight,
      publishedAt: items.publishedAt,
    })
    .from(documents)
    .innerJoin(items, eq(documents.itemId, items.id))
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .where(
      and(
        isNull(documents.processedAt),
        isNotNull(documents.cleanBlobKey),
        eq(items.status, "acquired")
      )
    )
    .orderBy(sources.tier, documents.acquiredAt)
    .limit(limit);

  return rows as AcquiredDocRow[];
}

function adjustedConfidence(
  claimConfidence: number,
  trustWeight: string
): number {
  const weight = Number(trustWeight) || 1;
  return Math.min(1, Math.max(0, claimConfidence * weight));
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
      magnitude: a.magnitude,
      uncertainty: a.uncertainty,
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

/**
 * Run signal processing: fetch acquired documents, extract signals via AI, persist, mark processed.
 */
export async function runSignalProcessing(
  ctx: SignalProcessingContext,
  options: SignalProcessingOptions = {}
): Promise<SignalProcessingStats> {
  const { db, r2BucketName, openRouterApiKey } = ctx;
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

  for (const row of batch) {
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
        stats.perDocument.push(result);
        stats.documentsFailed++;
        continue;
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
      stats.documentsProcessed++;
      stats.signalsCreated += created;
    } catch (err) {
      result.error =
        err instanceof Error ? err.message : "Signal processing failed";
      stats.documentsFailed++;
    }

    stats.perDocument.push(result);
  }

  stats.durationMs = Date.now() - startMs;
  return stats;
}
