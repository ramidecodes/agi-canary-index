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

| Variable                            | Description                                        |
| ----------------------------------- | -------------------------------------------------- |
| `DATABASE_URL`                      | Neon pooled connection string                      |
| `OPENROUTER_API_KEY`                | OpenRouter API key for AI inference                |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (admin auth)                 |
| `CLERK_SECRET_KEY`                  | Clerk secret key (admin auth)                      |
| `R2_ACCOUNT_ID`                     | Cloudflare account ID (for app to fetch documents) |
| `R2_ACCESS_KEY_ID`                  | R2 API token access key                            |
| `R2_SECRET_ACCESS_KEY`              | R2 API token secret                                |
| `R2_BUCKET_NAME`                    | R2 bucket name for document blobs                  |
| `R2_ENDPOINT`                       | R2 S3-compatible endpoint URL                      |

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

## Troubleshooting

- **Database connection fails:** Ensure DATABASE_URL secret is set with Neon pooled connection string. See [Neon + Cloudflare Workers](https://neon.tech/docs/guides/cloudflare-workers).
- **R2 put fails:** Verify R2 bucket exists and binding is correct in wrangler.jsonc
- **Worker timeout:** Increase `limits.cpu_ms` in wrangler.jsonc for long-running discovery
- **Secrets not found:** Run `wrangler secret put DATABASE_URL`, `wrangler secret put OPENROUTER_API_KEY`, and `wrangler secret put FIRECRAWL_API_KEY`

## References

- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Neon + Cloudflare Workers](https://neon.tech/docs/guides/cloudflare-workers)
- [R2 Bindings](https://developers.cloudflare.com/r2/api/workers/workers-api/)
- [Workers Queues](https://developers.cloudflare.com/queues/)
