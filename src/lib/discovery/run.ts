/**
 * Discovery pipeline orchestration.
 * Runs scheduled or manual discovery, deduplicates, and persists.
 * @see docs/features/03-discovery-pipeline.md
 */

import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { items, pipelineRuns, sourceFetchLogs, sources } from "../db/schema";
import { fetchCurated } from "./fetch-curated";
import { fetchRss } from "./fetch-rss";
import { fetchSearch } from "./fetch-search";
import { fetchX } from "./fetch-x";
import type { DiscoveredItem, DiscoveryRunStats } from "./types";

const CONCURRENCY = 5;
const DEDUP_DAYS = 30;
const X_SOURCE_ENABLED = true;

export interface DiscoveryOptions {
  dryRun?: boolean;
  openRouterApiKey: string;
  xSearchEnabled?: boolean;
}

export interface DiscoveryContext {
  db: ReturnType<typeof import("../db").createDb>;
  options: DiscoveryOptions;
}

/**
 * Execute discovery pipeline. Creates pipeline_run, fetches from sources,
 * deduplicates, and inserts new items.
 */
export async function runDiscovery(
  ctx: DiscoveryContext,
): Promise<DiscoveryRunStats> {
  const { db, options } = ctx;
  const startMs = Date.now();
  const stats: DiscoveryRunStats = {
    itemsDiscovered: 0,
    itemsInserted: 0,
    insertedItemIds: [],
    sourcesSucceeded: 0,
    sourcesFailed: 0,
    durationMs: 0,
    perSource: [],
  };

  if (!options.dryRun) {
    const running = await db
      .select({ id: pipelineRuns.id })
      .from(pipelineRuns)
      .where(eq(pipelineRuns.status, "running"))
      .limit(1);
    if (running.length > 0) {
      stats.durationMs = Date.now() - startMs;
      return stats;
    }
  }

  let runId: string | null = null;
  if (!options.dryRun) {
    const [run] = await db
      .insert(pipelineRuns)
      .values({ status: "running" })
      .returning({ id: pipelineRuns.id });
    runId = run?.id ?? null;
    if (!runId) {
      stats.durationMs = Date.now() - startMs;
      return stats;
    }
  }

  const activeSources = await db
    .select()
    .from(sources)
    .where(eq(sources.isActive, true));

  const allItems: DiscoveredItem[] = [];
  const xEnabled = options.xSearchEnabled ?? X_SOURCE_ENABLED;

  for (let i = 0; i < activeSources.length; i += CONCURRENCY) {
    const batch = activeSources.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (src) => {
        const result = await fetchFromSource(
          src,
          options.openRouterApiKey,
          xEnabled,
        );
        if (runId && result.items) {
          await logFetch(
            db,
            runId,
            src.id,
            src.name,
            result.items.length,
            !!result.error,
            result.error,
          );
        }
        if (result.error) {
          stats.perSource.push({
            sourceId: src.id,
            sourceName: src.name,
            itemsFound: 0,
            success: false,
            error: result.error,
          });
          stats.sourcesFailed++;
          if (!options.dryRun) {
            await db
              .update(sources)
              .set({
                errorCount: sql`${sources.errorCount} + 1`,
                updatedAt: new Date(),
              })
              .where(eq(sources.id, src.id));
          }
        } else {
          stats.perSource.push({
            sourceId: src.id,
            sourceName: src.name,
            itemsFound: result.items.length,
            success: true,
          });
          stats.sourcesSucceeded++;
          if (!options.dryRun) {
            await db
              .update(sources)
              .set({
                lastSuccessAt: new Date(),
                errorCount: 0,
                updatedAt: new Date(),
              })
              .where(eq(sources.id, src.id));
          }
          allItems.push(...result.items);
        }
        return result;
      }),
    );
  }

  stats.itemsDiscovered = allItems.length;

  const uniqueByHash = new Map<string, DiscoveredItem>();
  for (const item of allItems) {
    if (!uniqueByHash.has(item.urlHash)) {
      uniqueByHash.set(item.urlHash, item);
    }
  }
  const uniqueItems = [...uniqueByHash.values()];

  if (!options.dryRun && runId && uniqueItems.length > 0) {
    const hashes = uniqueItems.map((i) => i.urlHash);
    const cutoff = new Date(Date.now() - DEDUP_DAYS * 24 * 60 * 60 * 1000);
    const existing = await db
      .select({ urlHash: items.urlHash })
      .from(items)
      .where(
        and(inArray(items.urlHash, hashes), gt(items.discoveredAt, cutoff)),
      );
    const seenHashes = new Set(existing.map((r) => r.urlHash));
    const toInsert = uniqueItems.filter((i) => !seenHashes.has(i.urlHash));

    if (toInsert.length > 0) {
      const values = toInsert.map((item) => ({
        runId,
        sourceId: item.sourceId,
        url: item.url,
        urlHash: item.urlHash,
        title: item.title,
        status: "pending" as const,
        publishedAt: item.publishedAt,
      }));
      const inserted = await db
        .insert(items)
        .values(values)
        .onConflictDoNothing({ target: items.url })
        .returning({ id: items.id });
      stats.itemsInserted = inserted.length;
      for (const row of inserted) {
        stats.insertedItemIds?.push(row.id);
      }
    }
  } else if (options.dryRun) {
    stats.itemsInserted = uniqueItems.length;
  }

  if (!options.dryRun && runId) {
    await db
      .update(pipelineRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        itemsDiscovered: stats.itemsDiscovered,
        itemsProcessed: 0,
        itemsFailed: 0,
      })
      .where(eq(pipelineRuns.id, runId));
  }

  stats.durationMs = Date.now() - startMs;
  return stats;
}

async function fetchFromSource(
  src: {
    id: string;
    url: string;
    sourceType: string;
    queryConfig?: Record<string, unknown> | null;
  },
  apiKey: string,
  xEnabled: boolean,
): Promise<{ items: DiscoveredItem[]; error?: string }> {
  switch (src.sourceType) {
    case "rss":
      return fetchRss(src.url, src.id);
    case "search":
      return fetchSearch(src.id, apiKey, src.queryConfig ?? undefined);
    case "curated":
      return fetchCurated(src.url, src.id);
    case "x":
      if (!xEnabled) return { items: [] };
      return fetchX(src.id, apiKey, src.queryConfig ?? undefined);
    case "api":
      return { items: [], error: "API source type not implemented" };
    default:
      return { items: [], error: `Unknown source type: ${src.sourceType}` };
  }
}

async function logFetch(
  db: DiscoveryContext["db"],
  runId: string,
  sourceId: string,
  _sourceName: string,
  itemsFound: number,
  failed: boolean,
  errorMessage?: string,
): Promise<void> {
  await db.insert(sourceFetchLogs).values({
    runId,
    sourceId,
    status: failed ? "failure" : "success",
    itemsFound,
    errorMessage: failed ? (errorMessage ?? "Unknown error") : null,
  });
}
