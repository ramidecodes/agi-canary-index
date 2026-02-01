# AGI Canary Watcher - Infrastructure

This document describes the infrastructure setup for the AGI Canary Watcher project. The app uses **Next.js on Vercel** for the UI, API, AI signal processing, and the **data pipeline** (Discovery, Acquisition). R2 stores document blobs.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) package manager
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (for R2 bucket management)
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Neon](https://neon.tech/) account for Postgres
- [Vercel](https://vercel.com/) account for app and pipeline deployment

## Architecture Overview

- **Vercel:** Next.js app, API routes, AI signal processing, **pipeline (Discovery + Acquisition)** — all app and pipeline logic
- **Vercel Cron:** Triggers daily pipeline run at 6 AM UTC (`/api/pipeline/cron`)
- **Cloudflare R2:** Document blob storage (S3-compatible API)
- **Neon:** Postgres database (`@neondatabase/serverless` with pooled `DATABASE_URL`)

## Environment Variables

### Vercel (App + Pipeline)

Set these in Vercel project settings (or `.env` for local dev):

| Variable                            | Description                                              |
| ----------------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`                      | Neon pooled connection string                            |
| `OPENROUTER_API_KEY`                | OpenRouter API key for AI inference and discovery search |
| `FIRECRAWL_API_KEY`                 | Firecrawl API for content acquisition                    |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (admin auth)                       |
| `CLERK_SECRET_KEY`                  | Clerk secret key (admin auth)                            |
| `R2_ACCOUNT_ID`                     | Cloudflare account ID                                    |
| `R2_ACCESS_KEY_ID`                  | R2 API token access key                                  |
| `R2_SECRET_ACCESS_KEY`              | R2 API token secret                                      |
| `R2_BUCKET_NAME`                    | R2 bucket name (e.g. `agi-canary-documents-prod`)        |
| `R2_ENDPOINT`                       | R2 S3-compatible endpoint (optional)                     |
| `CRON_SECRET`                       | Secret for Vercel Cron auth (Bearer token)               |

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

### 3. Vercel App

1. Connect the repo to Vercel
2. Add all environment variables in Vercel dashboard
3. Set `CRON_SECRET` (e.g. `openssl rand -hex 32`) for Vercel Cron auth
4. Deploy — Vercel Cron will invoke `/api/pipeline/cron` daily at 6 AM UTC

## Pipeline Flow

1. **Discovery** runs daily (Vercel Cron) or via Admin UI. Inserts new items with status `pending`.
2. **Acquisition** is triggered by Discovery (same request) or manually. Fetches content via Firecrawl, stores in R2, creates document records.
3. **Signal processing** runs on Vercel (AI extraction, OpenRouter). Run manually from Admin UI.
4. **Daily snapshot** aggregates signals for a date. Run manually from Admin UI.

### Cron auth (CRON_SECRET)

Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` when invoking `/api/pipeline/cron`. The route verifies this token. Set `CRON_SECRET` in Vercel environment variables.

### Manual triggers (Admin UI)

Admin routes use **Clerk authentication** — sign in to access Admin → Pipeline. All pipeline steps run directly on Vercel:

- `POST /api/admin/pipeline/discover` — run discovery
- `POST /api/admin/pipeline/acquire` — run acquisition
- `POST /api/admin/pipeline/process` — run signal processing
- `POST /api/admin/pipeline/snapshot` — create daily snapshot

## Scripts

- `pnpm run infra:provision` — Create R2 bucket (idempotent). Use `-- --env=dev|staging|prod` or `ENV=…`.
- `pnpm run infra:teardown` — Remove R2 bucket for env (with confirmation). Use `-- --env=dev|staging|prod` or `ENV=…`. Does not touch Neon.

## Troubleshooting

- **Database connection fails:** Ensure `DATABASE_URL` is set with Neon pooled connection string.
- **R2 put fails:** Verify R2 bucket exists and `R2_*` env vars are set. Run `pnpm run infra:provision`.
- **Cron returns 401:** Set `CRON_SECRET` in Vercel. Vercel sends it as Bearer token automatically.
- **Manual trigger returns 401:** Sign in to admin UI first (Clerk authentication required).
- **Document content returns 503:** Set `R2_*` env vars in Vercel for S3 API.

## References

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Neon](https://neon.tech/docs)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
