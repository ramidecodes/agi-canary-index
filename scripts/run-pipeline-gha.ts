/**
 * Pipeline runner for GitHub Actions.
 * Creates a run + DISCOVER job (cron mode), then drains the job queue until empty or time budget.
 * Requires env: DATABASE_URL, OPENROUTER_API_KEY, FIRECRAWL_API_KEY, R2_* (see createR2Bucket).
 *
 * Usage: pnpm run pipeline:gha
 * In GHA, set secrets and run this script; no .env (secrets are passed as env).
 */

import { createDb } from "../src/lib/db";
import { createR2Bucket } from "../src/lib/r2";
import {
  claimJobs,
  countReadyJobs,
  createPipelineRun,
  enqueueJob,
  markJobDone,
  markJobFailed,
  processJob,
  releaseStaleJobLocks,
} from "../src/lib/pipeline";

const STALE_JOB_LOCK_MINUTES = 15;
const BATCH_SIZE = 15;
const TIME_BUDGET_MS = 55 * 60 * 1000; // 55 minutes

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  if (!openRouterApiKey) {
    console.error("OPENROUTER_API_KEY is required");
    process.exit(1);
  }
  if (!firecrawlApiKey) {
    console.error("FIRECRAWL_API_KEY is required");
    process.exit(1);
  }

  const db = createDb(databaseUrl);
  let runId: string | null = null;

  // Cron mode: create one pipeline run and enqueue DISCOVER job
  runId = await createPipelineRun(db);
  await enqueueJob(db, {
    runId,
    type: "discover",
    dedupeKey: `DISCOVER:${runId}`,
    payload: { sourceGroups: ["TIER_0", "TIER_1", "DISCOVERY"] },
    priority: 10,
  });
  console.log(JSON.stringify({ event: "run_created", runId }));

  const r2Bucket = createR2Bucket();
  const env = {
    DATABASE_URL: databaseUrl,
    OPENROUTER_API_KEY: openRouterApiKey,
    FIRECRAWL_API_KEY: firecrawlApiKey,
    DOCUMENTS: r2Bucket,
    BATCH_SIZE: String(BATCH_SIZE),
    TIME_BUDGET_MS: String(TIME_BUDGET_MS),
  };

  const started = Date.now();
  let totalProcessed = 0;

  while (Date.now() - started < TIME_BUDGET_MS) {
    await releaseStaleJobLocks(db, STALE_JOB_LOCK_MINUTES);

    const instanceId = `gha-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    const jobs = await claimJobs(db, BATCH_SIZE, instanceId);

    if (jobs.length === 0) {
      const remaining = await countReadyJobs(db);
      if (remaining === 0) break;
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    for (const job of jobs) {
      try {
        await processJob(job, env, db);
        await markJobDone(db, job.id);
        totalProcessed++;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        await markJobFailed(db, job.id, errorMsg);
        console.error(
          JSON.stringify({
            event: "job_failed",
            jobId: String(job.id),
            error: errorMsg,
          }),
        );
      }
    }

    const remaining = await countReadyJobs(db);
    console.log(
      JSON.stringify({
        event: "batch_done",
        processed: jobs.length,
        totalProcessed,
        remaining,
        durationMs: Date.now() - started,
      }),
    );

    if (remaining === 0) break;
  }

  console.log(
    JSON.stringify({
      event: "pipeline_finished",
      totalProcessed,
      durationMs: Date.now() - started,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
