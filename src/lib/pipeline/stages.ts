/**
 * Stage processors for ETL pipeline jobs.
 * Each stage processes its job and enqueues next-stage jobs.
 */

import { eq, sql } from "drizzle-orm";
import { items, documents, pipelineRuns, signals } from "@/lib/db/schema";
import type { Job, NeonDatabase } from "./db";
import { enqueueJob } from "./db";
import type { PipelineEnv } from "./types";
import { runDiscovery } from "@/lib/discovery/run";
import { runAcquisition } from "@/lib/acquisition/run";
import { extractSignals } from "@/lib/signal/extract";
import { createDailySnapshot } from "@/lib/signal/snapshot";
import type { SignalExtraction } from "@/lib/signal/schemas";

/**
 * Process a job based on its type.
 */
export async function processJob(
  job: Job,
  env: PipelineEnv,
  db: NeonDatabase,
): Promise<void> {
  switch (job.type) {
    case "discover":
      return processDiscover(job, env, db);
    case "fetch":
      return processFetch(job, env, db);
    case "extract":
      return processExtract(job, env, db);
    case "map":
      return processMap(job, db);
    case "aggregate":
      return processAggregate(job, db);
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

async function processDiscover(
  job: Job,
  env: PipelineEnv,
  db: NeonDatabase,
): Promise<void> {
  const dryRun = job.payload.dryRun === true;

  try {
    const stats = await runDiscovery({
      db,
      options: {
        openRouterApiKey: env.OPENROUTER_API_KEY,
        dryRun,
        forceNewRun: false,
        runId: job.runId,
      },
    });

    if (stats.insertedItemIds && stats.insertedItemIds.length > 0) {
      for (const itemId of stats.insertedItemIds) {
        const item = await db
          .select({ url: items.url, urlHash: items.urlHash })
          .from(items)
          .where(eq(items.id, itemId))
          .limit(1);

        if (item.length > 0) {
          await enqueueJob(db, {
            runId: job.runId,
            type: "fetch",
            payload: { itemId },
            dedupeKey: `FETCH:${item[0].urlHash}`,
            priority: 50,
          });
        }
      }
    }
  } catch (err) {
    if (job.runId) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await db
        .update(pipelineRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorLog: errMsg.slice(0, 4096),
        })
        .where(eq(pipelineRuns.id, job.runId));
    }
    throw err;
  }
}

async function processFetch(
  job: Job,
  env: PipelineEnv,
  db: NeonDatabase,
): Promise<void> {
  const itemId = job.payload.itemId as string;
  if (!itemId) throw new Error("FETCH job missing itemId");

  const r2Bucket = {
    async put(
      key: string,
      value: ReadableStream | ArrayBuffer | string,
      options?: { httpMetadata?: { contentType?: string } },
    ): Promise<void> {
      await env.DOCUMENTS.put(key, value, {
        httpMetadata: options?.httpMetadata,
      });
    },
    async get(key: string) {
      return env.DOCUMENTS.get(key);
    },
  };

  const stats = await runAcquisition(
    {
      db,
      r2Bucket,
    },
    { itemIds: [itemId] },
  );

  if (stats.itemsAcquired > 0) {
    const doc = await db
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.itemId, itemId))
      .limit(1);

    if (doc.length > 0) {
      await enqueueJob(db, {
        runId: job.runId,
        type: "extract",
        payload: { documentId: doc[0].id },
        dedupeKey: `EXTRACT:${doc[0].id}`,
        priority: 60,
      });
    }
  }
}

async function processExtract(
  job: Job,
  env: PipelineEnv,
  db: NeonDatabase,
): Promise<void> {
  const documentId = job.payload.documentId as string;
  if (!documentId) throw new Error("EXTRACT job missing documentId");

  const docRows = await db.execute(sql`
    SELECT 
      d.id,
      d.clean_blob_key,
      d.item_id,
      i.run_id,
      s.name as source_name,
      s.tier,
      s.trust_weight,
      i.published_at
    FROM documents d
    INNER JOIN items i ON d.item_id = i.id
    INNER JOIN sources s ON i.source_id = s.id
    WHERE d.id = ${documentId}
    LIMIT 1
  `);

  if (docRows.rows.length === 0) {
    throw new Error(`Document ${documentId} not found`);
  }

  const doc = docRows.rows[0] as {
    id: string;
    clean_blob_key: string;
    item_id: string;
    run_id: string;
    source_name: string;
    tier: string;
    trust_weight: string;
    published_at: Date | null;
  };

  const r2Obj = await env.DOCUMENTS.get(doc.clean_blob_key);
  if (!r2Obj) {
    throw new Error(`Content not found in R2: ${doc.clean_blob_key}`);
  }
  const contentBytes = await new Response(r2Obj.body).arrayBuffer();
  const content = new TextDecoder().decode(contentBytes);

  const extraction = await extractSignals(
    content,
    {
      sourceName: doc.source_name,
      tier: doc.tier,
      publishedDate: doc.published_at
        ? new Date(doc.published_at).toISOString().slice(0, 10)
        : null,
    },
    env.OPENROUTER_API_KEY,
  );

  await db
    .update(documents)
    .set({
      extractedMetadata: extraction as unknown as Record<string, unknown>,
    })
    .where(eq(documents.id, documentId));

  await enqueueJob(db, {
    runId: job.runId,
    type: "map",
    payload: { documentId, extractionId: documentId },
    dedupeKey: `MAP:${documentId}`,
    priority: 70,
  });
}

async function processMap(job: Job, db: NeonDatabase): Promise<void> {
  const documentId = job.payload.documentId as string;
  if (!documentId) throw new Error("MAP job missing documentId");

  const docRows = await db.execute(sql`
    SELECT 
      d.id,
      d.extracted_metadata,
      d.item_id,
      i.run_id,
      i.url as item_url,
      s.trust_weight
    FROM documents d
    INNER JOIN items i ON d.item_id = i.id
    INNER JOIN sources s ON i.source_id = s.id
    WHERE d.id = ${documentId}
    LIMIT 1
  `);

  if (docRows.rows.length === 0) {
    throw new Error(`Document ${documentId} not found`);
  }

  const doc = docRows.rows[0] as {
    id: string;
    extracted_metadata: SignalExtraction | null;
    item_id: string;
    run_id: string;
    item_url: string | null;
    trust_weight: string;
  };

  if (!doc.extracted_metadata) {
    throw new Error(`No extraction metadata for document ${documentId}`);
  }

  const extraction = doc.extracted_metadata;
  const trustWeight = doc.trust_weight;
  const itemUrl = doc.item_url ?? "";
  const scoringVersion = "v1";
  const CONFIDENCE_THRESHOLD = 0.5;
  const claims = extraction.claims ?? [];

  for (const claim of claims) {
    const adjustedConfidence = Math.min(
      1,
      Math.max(0, claim.confidence * Number(trustWeight || 1)),
    );

    if (adjustedConfidence < CONFIDENCE_THRESHOLD) continue;
    if (!claim.axes_impacted?.length) continue;

    const citations = (claim.citations ?? []).map((c) => ({
      url: c.url && c.url.trim() !== "" ? c.url : itemUrl,
      quoted_span: c.text,
    }));

    await db.insert(signals).values({
      documentId: documentId,
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
      confidence: String(Number(adjustedConfidence.toFixed(2))),
      citations,
      sourceUrl: itemUrl || null,
      scoringVersion,
    });
  }

  await db
    .update(documents)
    .set({
      processedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  const dateStr = new Date().toISOString().slice(0, 10);
  await enqueueJob(db, {
    runId: job.runId,
    type: "aggregate",
    payload: { date: dateStr },
    dedupeKey: `AGG:${dateStr}:${scoringVersion}`,
    priority: 90,
  });
}

async function processAggregate(job: Job, db: NeonDatabase): Promise<void> {
  const dateStr =
    (job.payload.date as string) ?? new Date().toISOString().slice(0, 10);

  await createDailySnapshot(db, dateStr);
}
