# AGI Canary Watcher - Infrastructure

This document describes the infrastructure setup for the AGI Canary Watcher project. The app uses **Next.js on Vercel** for the UI and API, **Cloudflare Workers** for the ETL pipeline (with Cron triggers), and **Cloudflare R2** for document blob storage.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) package manager
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (for R2 bucket management)
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Neon](https://neon.tech/) account for Postgres
- [Vercel](https://vercel.com/) account for app and pipeline deployment

## Architecture Overview

- **Vercel:** Next.js app, API routes, admin UI
- **Cloudflare Workers:** ETL pipeline orchestration (5 stages: DISCOVER, FETCH, EXTRACT, MAP, AGGREGATE)
- **Cloudflare Cron:** Triggers daily pipeline run at 3 AM UTC (via Worker scheduled handler)
- **Cloudflare R2:** Document blob storage (Workers binding + S3-compatible API for Next.js)
- **Neon:** Postgres database (`@neondatabase/serverless` with pooled `DATABASE_URL` + `jobs` table as durable queue)

## Environment Variables

### Vercel (Next.js App)

Set these in Vercel project settings (or `.env` for local dev):

| Variable                            | Description                                                       |
| ----------------------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`                      | Neon pooled connection string                                     |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (admin auth)                                |
| `CLERK_SECRET_KEY`                  | Clerk secret key (admin auth)                                     |
| `R2_ACCOUNT_ID`                     | Cloudflare account ID (for S3 API access)                         |
| `R2_ACCESS_KEY_ID`                  | R2 API token access key                                           |
| `R2_SECRET_ACCESS_KEY`              | R2 API token secret                                               |
| `R2_BUCKET_NAME`                    | R2 bucket name (e.g. `agi-canary-documents-prod`)                 |
| `R2_ENDPOINT`                       | R2 S3-compatible endpoint (optional)                              |
| `WORKER_URL`                        | Cloudflare Worker URL (e.g. `https://agi-canary-etl.workers.dev`) |
| `INTERNAL_TOKEN`                    | Internal auth token for Worker endpoints (server-side only!)      |

### Cloudflare Worker (ETL Pipeline)

Set these via `pnpm run infra:secrets` or `wrangler secret put`:

| Variable             | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `DATABASE_URL`       | Neon pooled connection string                            |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI inference and discovery search |
| `FIRECRAWL_API_KEY`  | Firecrawl API for content acquisition                    |
| `INTERNAL_TOKEN`     | Auth token for `/run` and `/jobs` endpoints              |

Worker config (vars or secrets):

- `BATCH_SIZE`: Jobs per `/run` invocation (default: 15)
- `TIME_BUDGET_MS`: Time budget per run in ms (default: 180000, 3 min; discovery needs longer)
- `WORKER_URL`: Base Worker URL for self-kick (e.g. `https://agi-canary-etl-prod.ramidecodes.workers.dev`). Worker builds `/run` from this. Same value as Vercel `WORKER_URL`; set via `wrangler secret put WORKER_URL` if using a custom domain.
- `RUNNER_URL`: Full URL to `/run` (optional override; if set, used instead of `WORKER_URL` + `/run`)

Clerk optional redirect URLs: see [.env.example](../.env.example). Model ID for signal extraction is hardcoded in `src/lib/ai-models.ts`; see [docs/MODELS.md](MODELS.md).

## Setup Steps

### 1. Neon Database

1. Create a Neon project at [console.neon.tech](https://console.neon.tech)
2. Copy the pooled connection string from Connection Details

### 2. Cloudflare R2 (document storage)

1. Log in: `pnpm exec wrangler login`
2. Create R2 bucket: `pnpm run infra:provision -- --env=prod` (idempotent)
3. In Cloudflare dashboard → R2 → Manage R2 API Tokens, create a token with Object Read & Write
4. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` in Vercel

### 3. Cloudflare Worker (ETL Pipeline)

1. Install Wrangler: `pnpm add -D wrangler`
2. Login: `pnpm exec wrangler login`
3. Set secrets: `pnpm run infra:secrets` (interactive) or manually:
   ```bash
   pnpm exec wrangler secret put DATABASE_URL
   pnpm exec wrangler secret put OPENROUTER_API_KEY
   pnpm exec wrangler secret put FIRECRAWL_API_KEY
   pnpm exec wrangler secret put INTERNAL_TOKEN
   ```
4. Deploy: `pnpm run worker:deploy` (dev) or `pnpm run worker:deploy:prod` (production)
5. Worker Cron will trigger daily at 3 AM UTC

### 4. Vercel App

1. Connect the repo to Vercel
2. Add all environment variables in Vercel dashboard
3. Deploy — Next.js app serves UI and admin API

## Pipeline Flow (Cloudflare Worker)

The ETL pipeline runs as a Cloudflare Worker with 5 stages:

1. **DISCOVER** — Runs discovery, creates items, enqueues FETCH jobs
2. **FETCH** — Acquires content via Firecrawl, stores in R2, enqueues EXTRACT jobs
3. **EXTRACT** — AI extraction from documents, enqueues MAP jobs
4. **MAP** — Creates signals from extracted claims, enqueues AGGREGATE jobs
5. **AGGREGATE** — Creates daily snapshot from signals

Jobs are stored in the `jobs` table (Postgres-backed durable queue) with SKIP LOCKED for safe concurrent claiming. The Worker uses a self-kick pattern: after processing a batch, if jobs remain, it self-invokes `/run` to continue processing.

### Cron Trigger

Cloudflare Cron triggers the Worker's `scheduled()` handler daily at 3 AM UTC. This creates a new pipeline run and enqueues the initial DISCOVER job, then kicks the runner.

### Manual Triggers

Admin UI can:

- **Kick Runner:** POST to Worker `/run` endpoint (processes next batch)
- **Enqueue Job:** POST to Worker `/jobs` endpoint (manually enqueue specific stage)
- **View Queue Status:** GET `/api/admin/jobs` (shows job counts, recent jobs, active runs)

Legacy Next.js API routes (`/api/admin/pipeline/*`) are deprecated but still functional for backward compatibility.

## Scripts

- `pnpm run infra:provision` — Create R2 bucket (idempotent). Use `-- --env=dev|staging|prod` or `ENV=…`.
- `pnpm run infra:teardown` — Remove R2 bucket for env (with confirmation). Use `-- --env=dev|staging|prod` or `ENV=…`. Does not touch Neon.
- `pnpm run infra:secrets` — Interactive script to set Cloudflare Worker secrets via wrangler
- `pnpm run worker:dev` — Run Worker locally with `wrangler dev`
- `pnpm run worker:deploy` — Deploy Worker to Cloudflare (dev environment)
- `pnpm run worker:deploy:prod` — Deploy Worker to Cloudflare (prod environment)

## Troubleshooting

- **Database connection fails:** Ensure `DATABASE_URL` is set with Neon pooled connection string (both Vercel and Worker).
- **R2 put fails:** Verify R2 bucket exists and `R2_*` env vars are set. Run `pnpm run infra:provision`.
- **Worker deployment fails:** Ensure Wrangler is logged in (`pnpm exec wrangler login`) and secrets are set (`pnpm run infra:secrets`).
- **Worker returns 401:** Set `INTERNAL_TOKEN` secret in Worker and `INTERNAL_TOKEN` in Vercel (must match). Note: NOT `NEXT_PUBLIC_` — this is server-side only.
- **Jobs not processing:** Check Worker logs (`pnpm exec wrangler tail`) and verify `DATABASE_URL` secret is set correctly.
- **Manual trigger returns 401:** Sign in to admin UI first (Clerk authentication required).
- **Document content returns 503:** Set `R2_*` env vars in Vercel for S3 API.

## References

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Neon](https://neon.tech/docs)
- [Vercel](https://vercel.com/docs)
