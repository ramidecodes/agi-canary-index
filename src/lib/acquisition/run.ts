/**
 * Content acquisition pipeline orchestration.
 * Fetches content via Firecrawl, validates, stores in R2, creates document records.
 * @see docs/features/04-acquisition-pipeline.md
 */

import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { documents, items, pipelineRuns } from "../db/schema";
import { extractMetadata } from "./metadata";
import { scrapeUrl } from "./firecrawl";
import { validateContent } from "./validate";
import type { AcquisitionRunStats, AcquireItemResult } from "./types";

const BATCH_SIZE = 50;
const MAX_ACQUISITION_ATTEMPTS = 3;

/** R2 bucket interface (Cloudflare Workers binding) */
export interface R2Bucket {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<void>;
  get(key: string): Promise<{
    body: ReadableStream;
    metadata?: Record<string, unknown>;
  } | null>;
}

export interface AcquisitionContext {
  db: ReturnType<typeof import("../db").createDb>;
  firecrawlApiKey: string;
  r2Bucket: R2Bucket;
}

export interface AcquisitionOptions {
  /** Specific item IDs to process; if not set, fetches up to BATCH_SIZE pending items */
  itemIds?: string[];
}

/** Permanent failure HTTP status codes (no retry) */
const PERMANENT_FAILURE_CODES = [404, 410];

function blobKey(itemId: string): string {
  return `documents/${itemId}/clean.md`;
}

/**
 * Execute acquisition pipeline. Processes batch of items, stores content in R2,
 * creates document records, updates item status.
 */
export async function runAcquisition(
  ctx: AcquisitionContext,
  options: AcquisitionOptions = {},
): Promise<AcquisitionRunStats> {
  const { db, firecrawlApiKey, r2Bucket } = ctx;
  const startMs = Date.now();
  const stats: AcquisitionRunStats = {
    itemsProcessed: 0,
    itemsAcquired: 0,
    itemsFailed: 0,
    durationMs: 0,
    perItem: [],
  };

  let toProcess: { id: string; url: string; runId: string }[];

  if (options.itemIds?.length) {
    const rows = await db
      .select({ id: items.id, url: items.url, runId: items.runId })
      .from(items)
      .where(
        and(
          inArray(items.id, options.itemIds),
          lt(items.acquisitionAttemptCount, MAX_ACQUISITION_ATTEMPTS),
        ),
      );
    toProcess = rows;
  } else {
    const rows = await db
      .select({ id: items.id, url: items.url, runId: items.runId })
      .from(items)
      .where(
        and(
          eq(items.status, "pending"),
          lt(items.acquisitionAttemptCount, MAX_ACQUISITION_ATTEMPTS),
        ),
      )
      .limit(BATCH_SIZE);
    toProcess = rows;
  }

  if (toProcess.length === 0) {
    stats.durationMs = Date.now() - startMs;
    return stats;
  }

  const itemToRun = new Map(toProcess.map((r) => [r.id, r.runId]));

  for (const item of toProcess) {
    const result = await acquireOne(db, r2Bucket, firecrawlApiKey, item);
    stats.itemsProcessed++;
    stats.perItem.push(result);

    if (result.success) {
      stats.itemsAcquired++;
    } else {
      stats.itemsFailed++;
    }
  }

  const runCounts = new Map<string, { acquired: number; failed: number }>();
  for (const r of stats.perItem) {
    const runId = itemToRun.get(r.itemId);
    if (!runId) continue;
    const c = runCounts.get(runId) ?? { acquired: 0, failed: 0 };
    if (r.success) c.acquired++;
    else c.failed++;
    runCounts.set(runId, c);
  }

  for (const [runId, counts] of runCounts) {
    await db
      .update(pipelineRuns)
      .set({
        itemsProcessed: sql`${pipelineRuns.itemsProcessed} + ${counts.acquired}`,
        itemsFailed: sql`${pipelineRuns.itemsFailed} + ${counts.failed}`,
      })
      .where(eq(pipelineRuns.id, runId));
  }

  stats.durationMs = Date.now() - startMs;
  return stats;
}

async function acquireOne(
  db: AcquisitionContext["db"],
  r2Bucket: R2Bucket,
  apiKey: string,
  item: { id: string; url: string },
): Promise<AcquireItemResult> {
  const scrapeResult = await scrapeUrl({
    url: item.url,
    apiKey,
    timeoutMs: 60_000,
  });

  if (!scrapeResult.success) {
    const errMsg = String(
      scrapeResult.metadata?.error ?? "Scrape failed",
    ).slice(0, 1024);
    const statusCode = scrapeResult.metadata?.statusCode as number | undefined;
    const permanentFail =
      statusCode && PERMANENT_FAILURE_CODES.includes(statusCode);

    await db
      .update(items)
      .set({
        acquisitionAttemptCount: sql`${items.acquisitionAttemptCount} + 1`,
        acquisitionError: errMsg,
        status: permanentFail ? "failed" : "pending",
      })
      .where(eq(items.id, item.id));

    return { itemId: item.id, success: false, error: errMsg };
  }

  const rawMarkdown = scrapeResult.data?.markdown ?? "";
  const validation = validateContent(rawMarkdown);

  if (!validation.valid || validation.paywalled) {
    const errMsg = validation.paywalled
      ? "Paywall or login wall detected"
      : `Content too short (${validation.wordCount} words)`;
    await db
      .update(items)
      .set({
        acquisitionAttemptCount: sql`${items.acquisitionAttemptCount} + 1`,
        acquisitionError: errMsg,
        status: "failed",
      })
      .where(eq(items.id, item.id));
    return { itemId: item.id, success: false, error: errMsg };
  }

  const extractedMeta = extractMetadata(scrapeResult, item.url);
  const key = blobKey(item.id);

  try {
    await r2Bucket.put(key, validation.content, {
      httpMetadata: { contentType: "text/markdown" },
    });
  } catch (err) {
    const errMsg = (
      err instanceof Error ? err.message : "R2 upload failed"
    ).slice(0, 1024);
    await db
      .update(items)
      .set({
        acquisitionAttemptCount: sql`${items.acquisitionAttemptCount} + 1`,
        acquisitionError: errMsg,
      })
      .where(eq(items.id, item.id));
    return { itemId: item.id, success: false, error: errMsg };
  }

  const [doc] = await db
    .insert(documents)
    .values({
      itemId: item.id,
      cleanBlobKey: key,
      extractedMetadata: extractedMeta as unknown as Record<string, unknown>,
      wordCount: validation.wordCount,
    })
    .returning({ id: documents.id });

  await db
    .update(items)
    .set({
      status: "acquired",
      acquisitionError: null,
    })
    .where(eq(items.id, item.id));

  return {
    itemId: item.id,
    success: true,
    documentId: doc?.id,
  };
}
