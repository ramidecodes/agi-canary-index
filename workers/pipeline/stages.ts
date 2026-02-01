/**
 * Stage processors for ETL pipeline jobs.
 * Each stage processes its job and enqueues next-stage jobs.
 */

import { eq, sql } from "drizzle-orm";
import { items, documents, signals } from "../../src/lib/db/schema";
import type { Job, NeonDatabase } from "./db";
import { enqueueJob } from "./db";
import type { Env } from "./index";
import { runDiscovery } from "../../src/lib/discovery/run";
import { runAcquisition } from "../../src/lib/acquisition/run";
import { extractSignals } from "../../src/lib/signal/extract";
import { createDailySnapshot } from "../../src/lib/signal/snapshot";
// R2 accessed via Workers binding in extract stage
import type { SignalExtraction } from "../../src/lib/signal/schemas";
// R2 is accessed via Workers binding, not S3 API

/**
 * Process a job based on its type.
 */
export async function processJob(
  job: Job,
  env: Env,
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

/**
 * DISCOVER stage: Run discovery pipeline and enqueue FETCH jobs for discovered items.
 */
async function processDiscover(
  job: Job,
  env: Env,
  db: NeonDatabase,
): Promise<void> {
  // Run discovery
  const stats = await runDiscovery({
    db,
    options: {
      openRouterApiKey: env.OPENROUTER_API_KEY,
      dryRun: false,
      forceNewRun: false,
    },
  });

  // Enqueue FETCH jobs for discovered items
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
}

/**
 * FETCH stage: Acquire content for an item and enqueue EXTRACT job.
 */
async function processFetch(
  job: Job,
  env: Env,
  db: NeonDatabase,
): Promise<void> {
  const itemId = job.payload.itemId as string;
  if (!itemId) {
    throw new Error("FETCH job missing itemId");
  }

  // Run acquisition for this item
  // Convert Workers R2Binding to R2Bucket interface
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
    async get(key: string): Promise<{
      body: ReadableStream;
      metadata?: Record<string, unknown>;
    } | null> {
      const obj = await env.DOCUMENTS.get(key);
      if (!obj) return null;
      return {
        body: obj.body,
        metadata: obj.customMetadata,
      };
    },
  };

  const stats = await runAcquisition(
    {
      db,
      firecrawlApiKey: env.FIRECRAWL_API_KEY,
      r2Bucket,
    },
    { itemIds: [itemId] },
  );

  // If acquisition succeeded, enqueue EXTRACT job
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

/**
 * EXTRACT stage: Extract signals from document and enqueue MAP job.
 */
async function processExtract(
  job: Job,
  env: Env,
  db: NeonDatabase,
): Promise<void> {
  const documentId = job.payload.documentId as string;
  if (!documentId) {
    throw new Error("EXTRACT job missing documentId");
  }

  // Get document with source info
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

  // Fetch content from R2 (Workers binding)
  const r2Obj = await env.DOCUMENTS.get(doc.clean_blob_key);
  if (!r2Obj) {
    throw new Error(`Content not found in R2: ${doc.clean_blob_key}`);
  }
  const contentBytes = await r2Obj.arrayBuffer();
  const content = new TextDecoder().decode(contentBytes);

  // Extract signals
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

  // Store extraction result and enqueue MAP job
  await db
    .update(documents)
    .set({
      extractedMetadata: extraction as unknown as Record<string, unknown>,
    })
    .where(eq(documents.id, documentId));

  await enqueueJob(db, {
    runId: job.runId,
    type: "map",
    payload: { documentId, extractionId: documentId }, // Use doc ID as extraction ID
    dedupeKey: `MAP:${documentId}`,
    priority: 70,
  });
}

/**
 * MAP stage: Create signals from extracted claims and enqueue AGGREGATE job.
 */
async function processMap(job: Job, db: NeonDatabase): Promise<void> {
  const documentId = job.payload.documentId as string;
  if (!documentId) {
    throw new Error("MAP job missing documentId");
  }

  // Get document with extraction metadata
  const docRows = await db.execute(sql`
    SELECT 
      d.id,
      d.extracted_metadata,
      d.item_id,
      i.run_id,
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
    trust_weight: string;
  };

  if (!doc.extracted_metadata) {
    throw new Error(`No extraction metadata for document ${documentId}`);
  }

  const extraction = doc.extracted_metadata;
  const trustWeight = doc.trust_weight;
  const scoringVersion = "v1";
  const CONFIDENCE_THRESHOLD = 0.3;

  // Process each claim
  const claims = extraction.claims ?? [];

  for (const claim of claims) {
    const adjustedConfidence = Math.min(
      1,
      Math.max(0, claim.confidence * Number(trustWeight || 1)),
    );

    if (adjustedConfidence < CONFIDENCE_THRESHOLD) continue;
    if (!claim.axes_impacted?.length) continue;

    const citations = (claim.citations ?? []).map((c) => ({
      url: c.url ?? "",
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
      scoringVersion,
    });
  }

  // Mark document as processed
  await db
    .update(documents)
    .set({
      processedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  // Enqueue AGGREGATE job for the date
  const dateStr = new Date().toISOString().slice(0, 10);
  await enqueueJob(db, {
    runId: job.runId,
    type: "aggregate",
    payload: { date: dateStr },
    dedupeKey: `AGG:${dateStr}:${scoringVersion}`,
    priority: 90,
  });
}

/**
 * AGGREGATE stage: Create daily snapshot from signals.
 */
async function processAggregate(job: Job, db: NeonDatabase): Promise<void> {
  const dateStr =
    (job.payload.date as string) ?? new Date().toISOString().slice(0, 10);

  await createDailySnapshot(db, dateStr);
}
