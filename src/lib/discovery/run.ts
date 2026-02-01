/**
 * Discovery pipeline orchestration.
 * Runs scheduled or manual discovery, deduplicates, and persists.
 * @see docs/features/03-discovery-pipeline.md
 */

import { and, eq, gt, inArray, lt, ne, sql } from "drizzle-orm";
import { items, pipelineRuns, sourceFetchLogs, sources } from "../db/schema";
import { fetchCurated } from "./fetch-curated";
import { fetchRss } from "./fetch-rss";
import { fetchSearch } from "./fetch-search";
import type { DiscoveredItem, DiscoveryRunStats } from "./types";

const CONCURRENCY = 2; // Lower = more event-loop yields, keeps app responsive
const DEDUP_DAYS = 30;
/** Mark runs stuck in "running" longer than this as failed before starting. */
const STALE_RUN_MINUTES = 3;
/** Max time per source fetch so one hung source does not block the whole run. */
const SOURCE_FETCH_TIMEOUT_MS = 60_000;

export interface DiscoveryOptions {
  dryRun?: boolean;
  openRouterApiKey: string;
  /** When true (e.g. manual admin trigger), supersede any running run and start a new one. */
  forceNewRun?: boolean;
  /** When provided (e.g. from Worker job), use this run instead of creating a new one. */
  runId?: string;
}

export interface DiscoveryContext {
  db: ReturnType<typeof import("../db").createDb>;
  options: DiscoveryOptions;
}

type Db = DiscoveryContext["db"];

const FETCHERS: Record<
  string,
  (
    src: {
      id: string;
      url: string;
      queryConfig?: Record<string, unknown> | null;
    },
    apiKey: string,
  ) => Promise<{ items: DiscoveredItem[]; error?: string }>
> = {
  rss: (s) => fetchRss(s.url, s.id),
  search: (s, k) => fetchSearch(s.id, k, s.queryConfig ?? undefined),
  curated: (s) => fetchCurated(s.url, s.id),
  x: async () => ({ items: [], error: "X source type disabled" }),
  api: async () => ({ items: [], error: "API source type not implemented" }),
};

interface PrepareResult {
  shouldSkip: boolean;
  stats?: DiscoveryRunStats;
}

function initStats(): DiscoveryRunStats {
  return {
    itemsDiscovered: 0,
    itemsInserted: 0,
    insertedItemIds: [],
    sourcesSucceeded: 0,
    sourcesFailed: 0,
    durationMs: 0,
    perSource: [],
  };
}

/**
 * Phase 1: Prepare run state. Mark stale/failed runs, check for blocking runs.
 * When dryRun, skip all DB writes. When forceNewRun, supersede running runs.
 */
async function prepareRunPhase(
  db: Db,
  options: DiscoveryOptions,
  startMs: number,
): Promise<PrepareResult> {
  const stats = initStats();

  if (options.dryRun) {
    return { shouldSkip: false };
  }

  if (options.forceNewRun) {
    await db
      .update(pipelineRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorLog: "Superseded by new run (manual trigger)",
      })
      .where(eq(pipelineRuns.status, "running"));
    return { shouldSkip: false };
  }

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

  let running: { id: string }[];
  if (options.runId != null) {
    const [ourRun] = await db
      .select({ startedAt: pipelineRuns.startedAt })
      .from(pipelineRuns)
      .where(eq(pipelineRuns.id, options.runId))
      .limit(1);
    const ourStartedAt = ourRun?.startedAt;
    if (ourStartedAt == null) {
      running = [];
    } else {
      running = await db
        .select({ id: pipelineRuns.id })
        .from(pipelineRuns)
        .where(
          and(
            eq(pipelineRuns.status, "running"),
            ne(pipelineRuns.id, options.runId),
            gt(pipelineRuns.startedAt, ourStartedAt),
          ),
        )
        .limit(1);
    }
  } else {
    running = await db
      .select({ id: pipelineRuns.id })
      .from(pipelineRuns)
      .where(eq(pipelineRuns.status, "running"))
      .limit(1);
  }

  if (running.length > 0) {
    stats.durationMs = Date.now() - startMs;
    stats.skipped = true;
    stats.skipReason = "run_already_in_progress";
    if (options.runId) {
      await db
        .update(pipelineRuns)
        .set({
          status: "completed",
          completedAt: new Date(),
          itemsDiscovered: 0,
          itemsProcessed: 0,
          itemsFailed: 0,
          errorLog: "Skipped: another run in progress",
        })
        .where(eq(pipelineRuns.id, options.runId));
    }
    console.log(
      JSON.stringify({
        event: "discovery_skipped",
        reason: stats.skipReason,
        runId: options.runId ?? undefined,
        durationMs: stats.durationMs,
      }),
    );
    return { shouldSkip: true, stats };
  }

  return { shouldSkip: false };
}

/**
 * Phase 2: Ensure we have a pipeline_run id. Create one if not dryRun and none provided.
 */
async function ensureRunId(
  db: Db,
  options: DiscoveryOptions,
  startMs: number,
): Promise<{ runId: string | null; stats: DiscoveryRunStats }> {
  const stats = initStats();
  let runId: string | null = options.runId ?? null;

  if (!options.dryRun && !runId) {
    const [run] = await db
      .insert(pipelineRuns)
      .values({ status: "running" })
      .returning({ id: pipelineRuns.id });
    runId = run?.id ?? null;
    if (!runId) {
      stats.durationMs = Date.now() - startMs;
      console.log(
        JSON.stringify({
          event: "discovery_no_run_id",
          durationMs: stats.durationMs,
        }),
      );
    }
  }

  return { runId, stats };
}

async function fetchWithTimeout(
  src: {
    id: string;
    name: string;
    url: string;
    sourceType: string;
    queryConfig?: Record<string, unknown> | null;
  },
  apiKey: string,
): Promise<{ items: DiscoveredItem[]; error?: string }> {
  const result = await Promise.race([
    fetchFromSource(src, apiKey),
    new Promise<{ items: DiscoveredItem[]; error?: string }>((_, reject) =>
      setTimeout(
        () => reject(new Error("Source fetch timeout (60s)")),
        SOURCE_FETCH_TIMEOUT_MS,
      ),
    ),
  ]).catch((err) => ({
    items: [] as DiscoveredItem[],
    error: err instanceof Error ? err.message : "Source fetch timeout",
  }));
  return result;
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
): Promise<{ items: DiscoveredItem[]; error?: string }> {
  const fn = FETCHERS[src.sourceType];
  if (fn) {
    return fn(src, apiKey);
  }
  return { items: [], error: `Unknown source type: ${src.sourceType}` };
}

async function processSourceResult(
  db: Db,
  result: { items: DiscoveredItem[]; error?: string },
  src: { id: string; name: string },
  runId: string | null,
  stats: DiscoveryRunStats,
  options: DiscoveryOptions,
): Promise<DiscoveredItem[]> {
  if (runId) {
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
    return [];
  }

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
  return result.items;
}

async function logFetch(
  db: Db,
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

function dedupByHash(items: DiscoveredItem[]): DiscoveredItem[] {
  const uniqueByHash = new Map<string, DiscoveredItem>();
  for (const item of items) {
    if (!uniqueByHash.has(item.urlHash)) {
      uniqueByHash.set(item.urlHash, item);
    }
  }
  return [...uniqueByHash.values()];
}

/**
 * Phase 4: Deduplicate against existing items, insert new ones, update stats.
 */
async function dedupAndPersist(
  db: Db,
  runId: string | null,
  uniqueItems: DiscoveredItem[],
  options: DiscoveryOptions,
  stats: DiscoveryRunStats,
): Promise<void> {
  if (options.dryRun) {
    stats.itemsInserted = uniqueItems.length;
    return;
  }

  if (!runId || uniqueItems.length === 0) {
    return;
  }

  const hashes = uniqueItems.map((i) => i.urlHash);
  const cutoff = new Date(Date.now() - DEDUP_DAYS * 24 * 60 * 60 * 1000);
  const existing = await db
    .select({ urlHash: items.urlHash })
    .from(items)
    .where(and(inArray(items.urlHash, hashes), gt(items.discoveredAt, cutoff)));
  const seenHashes = new Set(existing.map((r) => r.urlHash));
  const toInsert = uniqueItems.filter((i) => !seenHashes.has(i.urlHash));

  if (toInsert.length === 0) {
    return;
  }

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

/**
 * Execute discovery pipeline. Creates pipeline_run, fetches from sources,
 * deduplicates, and inserts new items.
 */
export async function runDiscovery(
  ctx: DiscoveryContext,
): Promise<DiscoveryRunStats> {
  const { db, options } = ctx;
  const startMs = Date.now();
  const stats = initStats();

  const prep = await prepareRunPhase(db, options, startMs);
  if (prep.shouldSkip && prep.stats) {
    return prep.stats;
  }

  const { runId, stats: ensureStats } = await ensureRunId(db, options, startMs);
  if (!runId && !options.dryRun && ensureStats.durationMs > 0) {
    return ensureStats;
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

    console.log(
      JSON.stringify({
        event: "discovery_start",
        runId,
        dryRun: options.dryRun ?? false,
        activeSourceCount: activeSources.length,
      }),
    );

    const allItems: DiscoveredItem[] = [];

    for (let i = 0; i < activeSources.length; i += CONCURRENCY) {
      const batch = activeSources.slice(i, i + CONCURRENCY);
      const batchIndex = Math.floor(i / CONCURRENCY) + 1;

      console.log(
        JSON.stringify({
          event: "discovery_batch_start",
          batchIndex,
          batchSize: batch.length,
          sourcesInBatch: batch.map((s) => `${s.name} (${s.sourceType})`),
          elapsedMs: Date.now() - startMs,
        }),
      );

      const results = await Promise.all(
        batch.map(async (src) => {
          const sourceStart = Date.now();
          console.log(
            JSON.stringify({
              event: "discovery_source_start",
              sourceName: src.name,
              sourceType: src.sourceType,
              elapsedMs: Date.now() - startMs,
            }),
          );
          const result = await fetchWithTimeout(src, options.openRouterApiKey);
          console.log(
            JSON.stringify({
              event: "discovery_source_complete",
              sourceName: src.name,
              success: !result.error,
              itemsFound: result.items?.length ?? 0,
              error: result.error,
              elapsedMs: Date.now() - sourceStart,
            }),
          );
          return result;
        }),
      );

      for (let j = 0; j < batch.length; j++) {
        const src = batch[j];
        const result = results[j];
        const itemsFromSource = await processSourceResult(
          db,
          result,
          src,
          runId,
          stats,
          options,
        );
        allItems.push(...itemsFromSource);
      }

      const elapsedMs = Date.now() - startMs;
      console.log(
        JSON.stringify({
          event: "discovery_batch_complete",
          batchIndex,
          batchSize: batch.length,
          sourcesInBatch: batch.map((s) => s.name),
          itemsSoFar: allItems.length,
          succeededSoFar: stats.sourcesSucceeded,
          failedSoFar: stats.sourcesFailed,
          elapsedMs,
        }),
      );
    }

    stats.itemsDiscovered = allItems.length;
    const uniqueItems = dedupByHash(allItems);

    await dedupAndPersist(db, runId, uniqueItems, options, stats);

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

    stats.durationMs = Date.now() - startMs;
    console.log(
      JSON.stringify({
        event: "discovery_completed",
        runId,
        itemsDiscovered: stats.itemsDiscovered,
        itemsInserted: stats.itemsInserted,
        sourcesSucceeded: stats.sourcesSucceeded,
        sourcesFailed: stats.sourcesFailed,
        durationMs: stats.durationMs,
      }),
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Discovery failed";
    await markRunFailed(errMsg);
    stats.durationMs = Date.now() - startMs;
    console.log(
      JSON.stringify({
        event: "discovery_failed",
        runId: runId ?? undefined,
        error: errMsg,
        durationMs: stats.durationMs,
      }),
    );
    throw err;
  }

  stats.durationMs = Date.now() - startMs;
  return stats;
}
