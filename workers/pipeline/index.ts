import { createDb } from "../../src/lib/db";
import {
  claimJobs,
  countReadyJobs,
  createPipelineRun,
  enqueueJob,
  markJobDone,
  markJobFailed,
} from "./db";
import { processJob } from "./stages";

export interface Env {
  DATABASE_URL: string;
  OPENROUTER_API_KEY: string;
  FIRECRAWL_API_KEY: string;
  INTERNAL_TOKEN: string;
  DOCUMENTS: R2Bucket;
  /** Base Worker URL (e.g. https://agi-canary-etl-prod.ramidecodes.workers.dev). Self-kick uses ${WORKER_URL}/run. */
  WORKER_URL?: string;
  BATCH_SIZE: string;
  TIME_BUDGET_MS: string;
}

function getRunnerUrl(env: Env): string {
  const base = env.WORKER_URL?.replace(/\/$/, "");
  if (base) return `${base}/run`;
  return "https://agi-canary-etl.workers.dev/run";
}

export default {
  // Cron trigger: create run + enqueue DISCOVER jobs + kick runner
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const db = createDb(env.DATABASE_URL);
    const runId = await createPipelineRun(db);

    // Enqueue initial DISCOVER jobs (one per source group or single)
    await enqueueJob(db, {
      runId,
      type: "discover",
      dedupeKey: `DISCOVER:${runId}`,
      payload: { sourceGroups: ["TIER_0", "TIER_1", "DISCOVERY"] },
      priority: 10,
    });

    // Self-kick the runner
    const runnerUrl = getRunnerUrl(env);
    ctx.waitUntil(
      fetch(runnerUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.INTERNAL_TOKEN}` },
        body: JSON.stringify({ runId }),
      }).catch((err) => {
        console.error("Failed to self-kick runner:", err);
      })
    );
  },

  // HTTP handler: /run processes job batches, /health for status, /jobs for manual enqueue
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname === "/run" && request.method === "POST") {
      if (!isAuthorized(request, env)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return handleRun(env, ctx);
    }

    if (url.pathname === "/jobs" && request.method === "POST") {
      // Manual job enqueue from Admin UI
      if (!isAuthorized(request, env)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return handleEnqueueJob(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};

function isAuthorized(request: Request, env: Env): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  return token === env.INTERNAL_TOKEN;
}

async function handleRun(env: Env, ctx: ExecutionContext): Promise<Response> {
  const db = createDb(env.DATABASE_URL);
  const started = Date.now();
  const timeBudget = parseInt(env.TIME_BUDGET_MS, 10) || 180000; // 3 min default for discovery
  const batchSize = parseInt(env.BATCH_SIZE, 10) || 15;
  const instanceId = crypto.randomUUID();

  const jobs = await claimJobs(db, batchSize, instanceId);
  if (jobs.length > 0) {
    console.log(
      JSON.stringify({
        event: "jobs_claimed",
        instanceId,
        count: jobs.length,
        jobIds: jobs.map((j) => j.id),
        types: jobs.map((j) => j.type),
      })
    );
  }
  let processed = 0;

  for (const job of jobs) {
    if (Date.now() - started > timeBudget) break;

    try {
      await processJob(job, env, db);
      await markJobDone(db, job.id);
      processed++;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      await markJobFailed(db, job.id, errorMsg);
    }
  }

  const remaining = await countReadyJobs(db);
  console.log(
    JSON.stringify({
      event: "run_batch",
      instanceId,
      processed,
      remaining,
      timeBudgetMs: timeBudget,
      durationMs: Date.now() - started,
    })
  );

  // Self-kick if more jobs remain
  if (remaining > 0) {
    const runnerUrl = getRunnerUrl(env);
    ctx.waitUntil(
      fetch(runnerUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.INTERNAL_TOKEN}` },
      }).catch((err) => {
        console.error("Failed to self-kick runner:", err);
      })
    );
  }

  return Response.json({ ok: true, processed, remaining });
}

async function handleEnqueueJob(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as {
      runId?: string;
      type: "discover" | "fetch" | "extract" | "map" | "aggregate";
      payload: Record<string, unknown>;
      dedupeKey?: string;
      priority?: number;
    };

    const db = createDb(env.DATABASE_URL);
    let runId = body.runId;

    // Create run if not provided
    if (!runId) {
      runId = await createPipelineRun(db);
    }

    await enqueueJob(db, {
      runId,
      type: body.type,
      payload: body.payload,
      dedupeKey: body.dedupeKey,
      priority: body.priority,
    });

    return Response.json({ ok: true, runId });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: errorMsg }, { status: 400 });
  }
}
