/// <reference types="@cloudflare/workers-types" />
/**
 * AGI Canary Pipeline Worker - Discovery & Acquisition
 * Runs daily via Cron (6 AM UTC); executes discovery, then acquisition.
 * @see docs/features/03-discovery-pipeline.md
 * @see docs/features/04-acquisition-pipeline.md
 */

import { createDb } from "../../src/lib/db";
import { runDiscovery } from "../../src/lib/discovery";
import { runAcquisition } from "../../src/lib/acquisition";

export interface Env {
  DATABASE_URL: string;
  OPENROUTER_API_KEY: string;
  FIRECRAWL_API_KEY: string;
  DOCUMENTS: R2Bucket;
  /** Optional: trigger Acquisition after discovery (self-URL for chaining) */
  ACQUISITION_WORKER_URL?: string;
  /** Optional: require token for manual /discover and /acquire triggers */
  DISCOVERY_TRIGGER_TOKEN?: string;
}

interface R2Bucket {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream } | null>;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/__scheduled" || url.pathname === "/health") {
      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("Use Cron trigger or POST /discover", {
        status: 400,
      });
    }
    if (url.pathname === "/discover") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }
      if (!isAuthorized(request, env)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return handleDiscover(env);
    }
    if (url.pathname === "/acquire") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }
      if (!isAuthorized(request, env)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return handleAcquire(request, env);
    }
    return new Response("Not Found", { status: 404 });
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(executeDiscovery(env));
  },
} satisfies ExportedHandler<Env>;

function isAuthorized(request: Request, env: Env): boolean {
  if (!env.DISCOVERY_TRIGGER_TOKEN) return true;
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  const headerToken = request.headers.get("x-discovery-token");
  return (
    token === env.DISCOVERY_TRIGGER_TOKEN ||
    headerToken === env.DISCOVERY_TRIGGER_TOKEN
  );
}

async function handleDiscover(env: Env): Promise<Response> {
  try {
    const stats = await executeDiscovery(env);
    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Discovery failed";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleAcquire(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      itemIds?: string[];
      continue?: boolean;
      triggeredBy?: string;
    };
    const db = createDb(env.DATABASE_URL);
    if (!env.FIRECRAWL_API_KEY || !env.DOCUMENTS) {
      return new Response(
        JSON.stringify({ error: "FIRECRAWL_API_KEY and DOCUMENTS required" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    const stats = await runAcquisition(
      {
        db,
        firecrawlApiKey: env.FIRECRAWL_API_KEY,
        r2Bucket: env.DOCUMENTS,
      },
      { itemIds: body.itemIds }
    );
    if (
      (body.continue || stats.itemsProcessed >= 50) &&
      env.ACQUISITION_WORKER_URL
    ) {
      try {
        await fetch(env.ACQUISITION_WORKER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ continue: true }),
        });
      } catch {
        // Chaining is best-effort
      }
    }
    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Acquisition failed";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function executeDiscovery(
  env: Env
): Promise<
  ReturnType<typeof runDiscovery> extends Promise<infer R> ? R : never
> {
  const dbUrl = env.DATABASE_URL;
  const apiKey = env.OPENROUTER_API_KEY;
  if (!dbUrl || !apiKey) {
    throw new Error("DATABASE_URL and OPENROUTER_API_KEY must be set");
  }
  const db = createDb(dbUrl);
  const stats = await runDiscovery({
    db,
    options: { openRouterApiKey: apiKey, dryRun: false },
  });
  if (env.ACQUISITION_WORKER_URL && stats.itemsInserted > 0) {
    try {
      const itemIds = (stats.insertedItemIds ?? []).slice(0, 50);
      await fetch(env.ACQUISITION_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggeredBy: "discovery",
          itemIds: itemIds.length ? itemIds : undefined,
          continue: true,
        }),
      });
    } catch {
      // Acquisition trigger is best-effort; don't fail discovery
    }
  }
  return stats;
}
