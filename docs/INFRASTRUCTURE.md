# AGI Canary Watcher - Infrastructure

This document describes the infrastructure setup for the AGI Canary Watcher project. The app uses a **hybrid architecture**: Next.js on Vercel for the UI and AI signal processing, Cloudflare Workers for the data pipeline (Discovery, Acquisition).

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) package manager
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (via `pnpm exec wrangler`)
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Neon](https://neon.tech/) account for Postgres
- [Vercel](https://vercel.com/) account for app deployment

## Architecture Overview

- **Vercel:** Next.js app, API routes, AI signal processing (AI SDK + OpenRouter) — UI and AI only
- **Cloudflare:** Pipeline scheduling and execution
  - **Cloudflare Cron** triggers the pipeline daily (e.g. 6 AM UTC) — not Vercel cron
  - **Cloudflare Workers** run Discovery and Acquisition
  - **R2** stores document blobs
- **Neon:** Postgres database (app and Workers both use `@neondatabase/serverless` with pooled `DATABASE_URL`)

## Environment Variables

### Vercel (App)

| Variable                            | Description                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                      | Neon pooled connection string                                                                      |
| `OPENROUTER_API_KEY`                | OpenRouter API key for AI inference                                                                |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (admin auth)                                                                 |
| `CLERK_SECRET_KEY`                  | Clerk secret key (admin auth)                                                                      |
| `R2_ACCOUNT_ID`                     | Cloudflare account ID (for app to fetch documents)                                                 |
| `R2_ACCESS_KEY_ID`                  | R2 API token access key                                                                            |
| `R2_SECRET_ACCESS_KEY`              | R2 API token secret                                                                                |
| `R2_BUCKET_NAME`                    | R2 bucket name (e.g. `agi-canary-documents-dev`)                                                   |
| `R2_ENDPOINT`                       | R2 S3-compatible endpoint (optional)                                                               |
| `ACQUISITION_WORKER_URL`            | Worker URL (e.g. `https://agi-canary-pipeline-dev.xxx.workers.dev`) for manual acquisition trigger |
| `DISCOVERY_TRIGGER_TOKEN`           | Optional; if set, passed to Worker when admin API proxies acquisition request                      |

Clerk optional redirect URLs: see [.env.example](../.env.example). Model ID for signal extraction is hardcoded in `src/lib/ai-models.ts`; see [docs/MODELS.md](MODELS.md).

### Cloudflare (Pipeline — Cron + Workers)

Pipeline scheduling uses **Cloudflare Cron** (in wrangler.jsonc), not Vercel. Secrets set via `wrangler secret put`:

| Secret               | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `DATABASE_URL`       | Neon pooled connection string (same as Vercel app)       |
| `OPENROUTER_API_KEY` | Perplexity (web search) + Grok (X search) via OpenRouter |
| `FIRECRAWL_API_KEY`  | Firecrawl API for content acquisition                    |

## Setup Steps

### 1. Neon Database

1. Create a Neon project at [console.neon.tech](https://console.neon.tech)
2. Copy the pooled connection string from Connection Details (use pooled connection for both app and Workers)

### 2. Cloudflare Pipeline Infrastructure

1. Run `pnpm run infra:provision --env dev` to create R2 bucket
2. Run `pnpm run infra:secrets` to set DATABASE_URL, OPENROUTER_API_KEY, and FIRECRAWL_API_KEY
3. Run `pnpm run infra:deploy --env dev` to deploy Workers

### 3. Vercel App

1. Connect the repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

## Scripts (from FRED 14)

- `pnpm run infra:provision` — Create R2 bucket
- `pnpm run infra:deploy` — Deploy Workers
- `pnpm run infra:secrets` — Interactive secret setup
- `pnpm run infra:teardown` — Remove resources (with confirmation)

## Pipeline Flow

1. **Discovery** runs daily (Cron) or via manual trigger. Inserts new items with status `pending`.
2. **Acquisition** is triggered by Discovery (HTTP) or manually. Fetches content via Firecrawl, stores in R2, creates document records.
3. Set `ACQUISITION_WORKER_URL` in both Worker (for Discovery→Acquisition chain) and Vercel (for manual trigger from admin UI).

## Manual Pipeline Triggers

**Discovery — via Admin UI (Next.js API):**

The `/api/admin/pipeline/discover` endpoint runs discovery logic directly in the Next.js app (requires Clerk authentication):

```bash
# From authenticated browser console:
fetch("/api/admin/pipeline/discover", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ dryRun: true }), // Optional: test without writing
})
  .then(r => r.json())
  .then(console.log);
```

**Response:**

```json
{
  "ok": true,
  "dryRun": true,
  "itemsDiscovered": 42,
  "itemsInserted": 35,
  "sourcesSucceeded": 12,
  "sourcesFailed": 1,
  "durationMs": 15234,
  "perSource": [...]
}
```

**Acquisition — via Admin UI (proxies to Worker):**

The `/api/admin/pipeline/acquire` endpoint proxies to the Worker (requires `ACQUISITION_WORKER_URL` in Vercel env):

```bash
# From authenticated browser console:
fetch("/api/admin/pipeline/acquire", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ itemIds: ["uuid1", "uuid2"], continue: true }),
})
  .then(r => r.json())
  .then(console.log);
```

**Via Worker HTTP (optional token-gated):**

If `DISCOVERY_TRIGGER_TOKEN` secret is set, the Worker's `/discover` and `/acquire` endpoints require authentication:

```bash
curl -X POST https://agi-canary-pipeline.your-account.workers.dev/discover \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -X POST https://agi-canary-pipeline.your-account.workers.dev/acquire \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"continue": true}'
```

If no token is set, the endpoints are open (not recommended for production).

## Troubleshooting

- **Database connection fails:** Ensure DATABASE_URL secret is set with Neon pooled connection string. See [Neon + Cloudflare Workers](https://neon.tech/docs/guides/cloudflare-workers).
- **R2 put fails:** Verify R2 bucket exists and binding is correct in wrangler.jsonc. Run `pnpm run infra:provision`.
- **Worker timeout:** Increase `limits.cpu_ms` in wrangler.jsonc for long-running discovery
- **Secrets not found:** Run `pnpm run infra:secrets` or `wrangler secret put DATABASE_URL`, `OPENROUTER_API_KEY`, `FIRECRAWL_API_KEY`
- **Manual trigger returns 401:** Sign in to admin UI first (Clerk authentication required)
- **Worker /discover or /acquire returns 401:** Set `DISCOVERY_TRIGGER_TOKEN` secret or remove token check
- **Acquisition not triggered after discovery:** Set `ACQUISITION_WORKER_URL` in Worker env (wrangler secret or vars)
- **Document content returns 503:** Set R2\_\* env vars in Vercel for S3 API; see [ACQUISITION.md](ACQUISITION.md)

## References

- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Neon + Cloudflare Workers](https://neon.tech/docs/guides/cloudflare-workers)
- [R2 Bindings](https://developers.cloudflare.com/r2/api/workers/workers-api/)
- [Workers Queues](https://developers.cloudflare.com/queues/)
