/**
 * Discovery pipeline orchestration.
 * Runs scheduled or manual discovery, deduplicates, and persists.
 * @see docs/features/03-discovery-pipeline.md
 */

import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { items, pipelineRuns, sourceFetchLogs, sources } from "../db/schema";
import { fetchCurated } from "./fetch-curated";
import { fetchRss } from "./fetch-rss";
import { fetchSearch } from "./fetch-search";
import { fetchX } from "./fetch-x";
import type { DiscoveredItem, DiscoveryRunStats } from "./types";

const CONCURRENCY = 2; // Lower = more event-loop yields, keeps app responsive
const DEDUP_DAYS = 30;
const X_SOURCE_ENABLED = true;
/** Mark runs stuck in "running" longer than this as failed before starting. */
const STALE_RUN_MINUTES = 3;
/** Max time per source fetch so one hung source does not block the whole run. */
const SOURCE_FETCH_TIMEOUT_MS = 60_000;

export interface DiscoveryOptions {
  dryRun?: boolean;
  openRouterApiKey: string;
  xSearchEnabled?: boolean;
  /** When true (e.g. manual admin trigger), supersede any running run and start a new one. */
  forceNewRun?: boolean;
  /** When provided (e.g. from Worker job), use this run instead of creating a new one. */
  runId?: string;
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
    if (options.forceNewRun) {
      await db
        .update(pipelineRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorLog: "Superseded by new run (manual trigger)",
        })
        .where(eq(pipelineRuns.status, "running"));
    } else {
      const staleCutoff = new Date(Date.now() - STALE_RUN_MINUTES * 60 * 1000);
      await db
        .update(pipelineRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorLog: "Marked failed (stale run)",
        })
        .where(
          and(
            eq(pipelineRuns.status, "running"),
            lt(pipelineRuns.startedAt, staleCutoff),
          ),
        );

      const running = await db
        .select({ id: pipelineRuns.id })
        .from(pipelineRuns)
        .where(eq(pipelineRuns.status, "running"))
        .limit(1);
      if (running.length > 0) {
        stats.durationMs = Date.now() - startMs;
        stats.skipped = true;
        stats.skipReason = "run_already_in_progress";
        return stats;
      }
    }
  }

  let runId: string | null = options.runId ?? null;
  if (!options.dryRun && !runId) {
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

  const markRunFailed = async (errMsg: string) => {
    if (!options.dryRun && runId) {
      await db
        .update(pipelineRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorLog: errMsg.slice(0, 4096),
        })
        .where(eq(pipelineRuns.id, runId));
    }
  };

  try {
    const activeRows = await db
      .select()
      .from(sources)
      .where(eq(sources.isActive, true));
    const activeSources = activeRows.filter(
      (s) => !s.url.includes("example.com"),
    );

    const allItems: DiscoveredItem[] = [];
    const xEnabled = options.xSearchEnabled ?? X_SOURCE_ENABLED;

    for (let i = 0; i < activeSources.length; i += CONCURRENCY) {
      const batch = activeSources.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (src) => {
          const result = await Promise.race([
            fetchFromSource(src, options.openRouterApiKey, xEnabled),
            new Promise<{ items: DiscoveredItem[]; error?: string }>(
              (_, reject) =>
                setTimeout(
                  () => reject(new Error("Source fetch timeout (60s)")),
                  SOURCE_FETCH_TIMEOUT_MS,
                ),
            ),
          ]).catch((err) => ({
            items: [] as DiscoveredItem[],
            error: err instanceof Error ? err.message : "Source fetch timeout",
          }));
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

    if (runId) {
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
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Discovery failed";
    await markRunFailed(errMsg);
    throw err;
  } finally {
    if (runId) {
      await db
        .update(pipelineRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorLog: "Run did not complete (timeout or crash)",
        })
        .where(
          and(eq(pipelineRuns.id, runId), eq(pipelineRuns.status, "running")),
        );
    }
  }

  stats.durationMs = Date.now() - startMs;
  return stats;
}

async function fetchFromSource(
  src: {
    id: string;
    name: string;
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
