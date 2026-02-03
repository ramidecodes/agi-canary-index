# AGI Canary Watcher - Infrastructure

This document describes the infrastructure setup for the AGI Canary Watcher project. The app uses **Next.js on Vercel** for the UI and API, **GitHub Actions** for the ETL pipeline (scheduled and manual), and **Cloudflare R2** for document blob storage.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) package manager
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (for R2 bucket management only)
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Neon](https://neon.tech/) account for Postgres
- [Vercel](https://vercel.com/) account for app deployment
- [GitHub](https://github.com/) repository (for Actions pipeline)

## Architecture Overview

- **Vercel:** Next.js app, API routes, admin UI
- **GitHub Actions:** ETL pipeline orchestration (5 stages: DISCOVER, FETCH, EXTRACT, MAP, AGGREGATE). Scheduled daily at 3 AM UTC; manual run via `workflow_dispatch`
- **Cloudflare R2:** Document blob storage (S3-compatible API; used by Next.js and by the GHA runner script)
- **Neon:** Postgres database (`@neondatabase/serverless` with pooled `DATABASE_URL` + `jobs` table as durable queue)

## Environment Variables

### Vercel (Next.js App)

Set these in Vercel project settings (or `.env` for local dev):

| Variable                            | Description                                       |
| ----------------------------------- | ------------------------------------------------- |
| `DATABASE_URL`                      | Neon pooled connection string                     |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (admin auth)                |
| `CLERK_SECRET_KEY`                  | Clerk secret key (admin auth)                     |
| `R2_ACCOUNT_ID`                     | Cloudflare account ID (for S3 API access)         |
| `R2_ACCESS_KEY_ID`                  | R2 API token access key                           |
| `R2_SECRET_ACCESS_KEY`              | R2 API token secret                               |
| `R2_BUCKET_NAME`                    | R2 bucket name (e.g. `agi-canary-documents-prod`) |
| `R2_ENDPOINT`                       | R2 S3-compatible endpoint (optional)              |

### GitHub Actions (ETL Pipeline)

Set these as repository (or environment) secrets in GitHub → Settings → Secrets and variables → Actions:

| Secret                 | Description                                              |
| ---------------------- | -------------------------------------------------------- |
| `DATABASE_URL`         | Neon pooled connection string                            |
| `OPENROUTER_API_KEY`   | OpenRouter API key for AI inference and discovery search |
| `FIRECRAWL_API_KEY`    | Firecrawl API for content acquisition                    |
| `R2_ACCOUNT_ID`        | Cloudflare account ID (R2)                               |
| `R2_ACCESS_KEY_ID`     | R2 API token access key                                  |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret                                      |
| `R2_BUCKET_NAME`       | R2 bucket name (e.g. `agi-canary-documents-prod`)        |

Optional: `R2_ENDPOINT` if using a custom endpoint.

Workflow uses `BATCH_SIZE` and `TIME_BUDGET_MS` from env (defaults in script). No `WORKER_URL` or `INTERNAL_TOKEN` needed for the pipeline.

Clerk redirect URLs: see [.env.example](../.env.example). Model ID for signal extraction is in `src/lib/ai-models.ts`; see [docs/MODELS.md](MODELS.md).

## Setup Steps

### 1. Neon Database

1. Create a Neon project at [console.neon.tech](https://console.neon.tech)
2. Copy the pooled connection string from Connection Details

### 2. Cloudflare R2 (document storage)

1. Log in: `pnpm exec wrangler login`
2. Create R2 bucket: `pnpm run infra:provision -- --env=prod` (idempotent)
3. In Cloudflare dashboard → R2 → Manage R2 API Tokens, create a token with Object Read & Write
4. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` in Vercel and in GitHub Actions secrets

### 3. GitHub Actions (ETL Pipeline)

1. In the repo: **Settings** → **Secrets and variables** → **Actions**, add the secrets listed above (see [GITHUB-ACTIONS-SETUP.md](GITHUB-ACTIONS-SETUP.md) for step-by-step instructions).
2. Workflow file: `.github/workflows/pipeline.yml`
   - **Scheduled:** Runs daily at 3:00 UTC (`schedule: 0 3 * * *`)
   - **Manual:** **Actions** tab → "Pipeline" → Run workflow
3. Pipeline script: `pnpm run pipeline:gha` (run locally with same env for testing)

### 4. Vercel App

1. Connect the repo to Vercel
2. Add all environment variables in Vercel dashboard
3. Deploy — Next.js app serves UI and admin API

## Pipeline Flow (GitHub Actions)

The ETL pipeline runs in GitHub Actions via `scripts/run-pipeline-gha.ts`:

1. **DISCOVER** — Runs discovery, creates items, enqueues FETCH jobs
2. **FETCH** — Acquires content via Firecrawl, stores in R2, enqueues EXTRACT jobs
3. **EXTRACT** — AI extraction from documents, enqueues MAP jobs
4. **MAP** — Creates signals from extracted claims, enqueues AGGREGATE jobs
5. **AGGREGATE** — Creates daily snapshot from signals

Jobs are stored in the `jobs` table (Postgres) with SKIP LOCKED for safe concurrent claiming. The GHA job runs in a single process and drains the queue until no ready jobs remain or a time budget is reached.

### Scheduled Run

The workflow runs at 3 AM UTC. It creates a new pipeline run and enqueues the initial DISCOVER job, then processes the queue.

### Manual Triggers

- **Run Discovery (admin UI):** POST `/api/admin/pipeline/discover` creates a run and enqueues a DISCOVER job. The next scheduled or manually triggered GHA run will process it.
- **Run pipeline now:** GitHub → Actions → "Pipeline (ETL)" → Run workflow
- **Job Queue Status:** GET `/api/admin/jobs` (job counts, recent jobs, active runs)

Legacy Next.js API routes (`/api/admin/pipeline/acquire`, `process`, `snapshot`) remain for backward compatibility.

### Admin UI ↔ API mapping

| Admin action            | API route                           | Behavior                                                                                                                                                                    |
| ----------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Run Discovery**       | `POST /api/admin/pipeline/discover` | Creates a pipeline run and enqueues one DISCOVER job. No immediate runner; the next GHA run (scheduled or manual) drains the queue. Use "Job Queue Status" to see progress. |
| **Run Acquisition**     | `POST /api/admin/pipeline/acquire`  | Runs acquisition **on Vercel** (Firecrawl + R2, up to 5 min). Use to fetch content for pending items without waiting for GHA.                                               |
| **Run Processing**      | `POST /api/admin/pipeline/process`  | Runs signal processing **on Vercel** (AI extraction + signals, up to 5 min). Use to process acquired documents immediately.                                                 |
| **Run Snapshot**        | `POST /api/admin/pipeline/snapshot` | Runs snapshot **on Vercel** (aggregate signals for chosen date). Use to build or refresh a daily snapshot.                                                                  |
| **Refresh (job queue)** | `GET /api/admin/jobs`               | Returns job counts by status/type, recent jobs, and active pipeline runs.                                                                                                   |

Discovery is the only step that **enqueues** a job for GHA; the other three run directly on the Next.js server (Vercel). To run the full pipeline (including discovery) on a schedule or in one go, use GitHub Actions.

## Scripts

- `pnpm run infra:provision` — Create R2 bucket (idempotent). Use `-- --env=dev|staging|prod` or `ENV=…`.
- `pnpm run infra:teardown` — Remove R2 bucket for env (with confirmation). Use `-- --env=dev|staging|prod` or `ENV=…`. Does not touch Neon.
- `pnpm run pipeline:gha` — Run pipeline locally (same script as GHA; requires env vars).
- `pnpm run pipeline:discover:local` — Run discovery only (local).
- `pnpm run pipeline:acquire:local` — Run acquisition only (local).
- `pnpm run pipeline:signal:local` — Run signal processing only (local).
- `pnpm run pipeline:snapshot:local` — Run snapshot only (local).

## Troubleshooting

- **Database connection fails:** Ensure `DATABASE_URL` is set (Vercel and GitHub Actions secrets).
- **R2 put fails:** Verify R2 bucket exists and `R2_*` env vars are set. Run `pnpm run infra:provision`.
- **GHA pipeline fails:** Check Actions logs; verify all required secrets are set in the repo.
- **Jobs not processing:** Pipeline runs on schedule or when workflow is triggered; ensure DISCOVER was enqueued (admin or scheduled run).
- **Manual trigger returns 401:** Sign in to admin UI first (Clerk authentication required).
- **Document content returns 503:** Set `R2_*` env vars in Vercel for S3 API.

## References

- [GitHub Actions](https://docs.github.com/en/actions)
- [GitHub Actions: schedule](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Neon](https://neon.tech/docs)
- [Vercel](https://vercel.com/docs)
