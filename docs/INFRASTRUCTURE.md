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

| Secret                    | Description                                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | Neon pooled connection string (same as Vercel app)                                                                                                                    |
| `OPENROUTER_API_KEY`      | Perplexity (web search) + Grok (X search) via OpenRouter                                                                                                              |
| `FIRECRAWL_API_KEY`       | Firecrawl API for content acquisition                                                                                                                                 |
| `DISCOVERY_TRIGGER_TOKEN` | Optional. Shared secret for `/discover` and `/acquire`; if set, requests must send Bearer or `x-discovery-token`                                                      |
| `ACQUISITION_WORKER_URL`  | Optional. Full Worker URL (e.g. `https://agi-canary-pipeline-prod.xxx.workers.dev`) for Discovery→Acquisition chaining; Worker sends Bearer token when calling itself |

## Cloudflare pipeline setup (detailed runbook)

Use this runbook when setting up the pipeline from scratch or repeating the setup (e.g. new account or env). The app is assumed deployed on Vercel (e.g. `agi-canary.ramilabs.com`).

### Prerequisites

- **Cloudflare account** — [dash.cloudflare.com](https://dash.cloudflare.com)
- **Wrangler** — Use the project’s: `pnpm exec wrangler`. Log in once: `pnpm exec wrangler login` (opens browser).
- **Same Neon DB as Vercel** — Use the **pooled** `DATABASE_URL` from your Vercel project.
- **API keys** — OpenRouter (discovery), Firecrawl (acquisition). Same or consistent with Vercel.

### Step 1: Choose environment

Use `--env=prod` for production (e.g. with `agi-canary.ramilabs.com`). For staging/dev use `--env=staging` or `--env=dev`.

- **prod:** R2 bucket `agi-canary-documents-prod`, Worker name `agi-canary-pipeline-prod`
- **dev:** R2 bucket `agi-canary-documents-dev`, Worker name `agi-canary-pipeline-dev`

### Step 2: Provision R2 bucket

Creates the bucket where the Worker stores scraped documents. Idempotent (safe to re-run).

```bash
pnpm run infra:provision -- --env=prod
# or: ENV=prod pnpm run infra:provision
```

Expect: “Created R2 bucket: agi-canary-documents-prod” or “already exists”.

### Step 3: Set Worker secrets

The Worker needs DB and API keys. Run the interactive script (prompts for each value):

```bash
pnpm run infra:secrets -- --env=prod
```

When prompted, provide:

| Secret                 | What to use                                                             |
| ---------------------- | ----------------------------------------------------------------------- |
| **DATABASE_URL**       | Neon **pooled** connection string (same as in Vercel).                  |
| **OPENROUTER_API_KEY** | OpenRouter API key (discovery). Same as Vercel if you have it there.    |
| **FIRECRAWL_API_KEY**  | Firecrawl API key for acquisition. Can leave blank to skip acquisition. |

The script only prompts for these three. To set **DISCOVERY_TRIGGER_TOKEN** and **ACQUISITION_WORKER_URL** on the Worker, use Wrangler after the first deploy (Step 5):

```bash
pnpm exec wrangler secret put DISCOVERY_TRIGGER_TOKEN --env=prod
pnpm exec wrangler secret put ACQUISITION_WORKER_URL --env=prod
```

For `ACQUISITION_WORKER_URL`, enter the **full Worker URL** (e.g. `https://agi-canary-pipeline-prod.<your-subdomain>.workers.dev`) — you get this URL after the first deploy.

### Step 4: Deploy the Worker

```bash
pnpm run infra:deploy -- --env=prod
# or: ENV=prod pnpm run infra:deploy
```

Wrangler builds and deploys. At the end you get a URL like:

`https://agi-canary-pipeline-prod.<account>.workers.dev`

Save this URL for Vercel env and, if you use chaining, for the Worker secret `ACQUISITION_WORKER_URL`.

### Step 5: Configure Vercel (admin UI → Worker)

In the Vercel project **Environment Variables** (Production, and Preview if desired), add:

| Variable                    | Value                                                                        | Purpose                                                                     |
| --------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **ACQUISITION_WORKER_URL**  | `https://agi-canary-pipeline-prod.<account>.workers.dev` (no trailing slash) | So `POST /api/admin/pipeline/acquire` can proxy to the Worker’s `/acquire`. |
| **DISCOVERY_TRIGGER_TOKEN** | (optional) Same long random string you set on the Worker                     | So Vercel sends `Authorization: Bearer <token>` when calling the Worker.    |

Redeploy the Vercel app after changing env vars if they don’t auto-apply.

### Step 6: Worker → Worker chaining (optional)

If you want the Worker to run acquisition right after discovery (cron or manual discover), set the Worker’s own URL on the Worker:

```bash
pnpm exec wrangler secret put ACQUISITION_WORKER_URL --env=prod
```

Enter the same Worker URL (e.g. `https://agi-canary-pipeline-prod.<account>.workers.dev`). The Worker will call `/acquire` on that URL and, if `DISCOVERY_TRIGGER_TOKEN` is set, will send `Authorization: Bearer <token>` so the request is authorized.

### Step 7: R2 access from Vercel (document content)

The Next.js app reads document content from R2 (admin viewer, signal processing). In Vercel, ensure these are set (from Cloudflare dashboard → R2 → Manage R2 API Tokens):

| Variable                 | Description                      |
| ------------------------ | -------------------------------- |
| **R2_ACCOUNT_ID**        | Cloudflare account ID            |
| **R2_ACCESS_KEY_ID**     | R2 API token access key          |
| **R2_SECRET_ACCESS_KEY** | R2 API token secret              |
| **R2_BUCKET_NAME**       | e.g. `agi-canary-documents-prod` |
| **R2_ENDPOINT**          | Optional                         |

### Wrangler config notes (free plan and warnings)

- **CPU limits:** Not supported on the Workers **free** plan. Do not set `limits.cpu_ms` in `wrangler.jsonc`; omit `limits` so the free-tier default (10ms CPU) is used. On a paid plan you can add `limits: { "cpu_ms": 300000 }` for longer discovery/acquisition.
- **workers_dev:** Set `"workers_dev": true` in `wrangler.jsonc` so the Worker gets a `*.workers.dev` URL (needed for Vercel and manual triggers). Explicit setting avoids deploy warnings.
- **preview_urls:** Set `"preview_urls": false` to disable per-deploy preview URLs and silence the related warning (optional; useful for a single pipeline Worker).
- **$schema:** `"$schema": "./node_modules/wrangler/config-schema.json"` enables config validation and editor support.

### Bearer auth (DISCOVERY_TRIGGER_TOKEN)

When **DISCOVERY_TRIGGER_TOKEN** is set (on the Worker as a secret and optionally on Vercel):

- **Incoming requests** to the Worker’s `/discover` and `/acquire` must send the token via:
  - `Authorization: Bearer <token>`, or
  - `x-discovery-token: <token>`
- **Vercel** → Worker: The admin API route `POST /api/admin/pipeline/acquire` sends `Authorization: Bearer <DISCOVERY_TRIGGER_TOKEN>` when the env var is set (see `src/app/api/admin/pipeline/acquire/route.ts`).
- **Worker self-calls:** When the Worker triggers acquisition (after discovery or for chaining), it calls its own `/acquire` URL. It now sends `Authorization: Bearer <DISCOVERY_TRIGGER_TOKEN>` when the secret is set, so those requests are authorized and chaining works with a token-protected Worker.

If `DISCOVERY_TRIGGER_TOKEN` is not set, `/discover` and `/acquire` are open (not recommended for production).

### Verification

1. **Worker health:**  
   `curl https://agi-canary-pipeline-prod.<account>.workers.dev/health`  
   Expect: `{"status":"ok"}`

2. **Cron:** Cloudflare dashboard → Workers & Pages → your Worker → Triggers: cron (e.g. `0 6 * * *` = 06:00 UTC daily).

3. **Admin UI:** On your app (e.g. agi-canary.ramilabs.com), sign in, open Admin → pipeline triggers. **Discover** runs on Vercel. **Acquire** should work if `ACQUISITION_WORKER_URL` (and optionally `DISCOVERY_TRIGGER_TOKEN`) are set.

4. **Manual Worker trigger with token:**  
   `curl -X POST https://...workers.dev/discover -H "Authorization: Bearer YOUR_TOKEN"`  
   If no token is set on the Worker, omit the header.

## Setup Steps (summary)

### 1. Neon Database

1. Create a Neon project at [console.neon.tech](https://console.neon.tech)
2. Copy the pooled connection string from Connection Details (use pooled connection for both app and Workers)

### 2. Cloudflare Pipeline Infrastructure

Use the [Cloudflare pipeline setup (detailed runbook)](#cloudflare-pipeline-setup-detailed-runbook) above, or the short version:

1. Run `pnpm run infra:provision -- --env=prod` to create R2 bucket (idempotent)
2. Run `pnpm run infra:secrets -- --env=prod` to set DATABASE_URL, OPENROUTER_API_KEY, FIRECRAWL_API_KEY
3. Run `pnpm run infra:deploy -- --env=prod` to deploy Workers
4. Optionally: `wrangler secret put DISCOVERY_TRIGGER_TOKEN --env=prod` and `wrangler secret put ACQUISITION_WORKER_URL --env=prod` (use the Worker URL from step 3)

Alternative: `ENV=prod pnpm run infra:deploy` (no `--` needed when using the `ENV` variable).

### 3. Vercel App

1. Connect the repo to Vercel
2. Add environment variables in Vercel dashboard (including `ACQUISITION_WORKER_URL` and, if used, `DISCOVERY_TRIGGER_TOKEN`)
3. Deploy

## Scripts (from FRED 14)

- `pnpm run infra:provision` — Create R2 bucket (idempotent; checks list first). Use `-- --env=dev|staging|prod` or `ENV=…`.
- `pnpm run infra:deploy` — Deploy Workers. Use `-- --env=dev|staging|prod` or `ENV=…`.
- `pnpm run infra:secrets` — Interactive secret setup. Use `-- --env=dev|staging|prod` or `ENV=…`.
- `pnpm run infra:teardown` — Remove R2 bucket and Worker for env (with confirmation). Use `-- --env=dev|staging|prod` or `ENV=…`. Does not touch Neon or secrets.

Scripts are tested on **macOS and Linux**. On Windows use WSL or run the TypeScript scripts with `tsx` and set `ENV` for env selection (bash deploy script may need Git Bash or WSL).

## Pipeline Flow

1. **Discovery** runs daily (Cron) or via manual trigger. Inserts new items with status `pending`.
2. **Acquisition** is triggered by Discovery (HTTP) or manually. Fetches content via Firecrawl, stores in R2, creates document records.
3. **Signal processing** runs on Vercel (AI extraction, OpenRouter). Not triggered by the Worker; run manually or via external scheduler.
4. **Daily snapshot** aggregates signals for a date. Run manually after processing.

Set `ACQUISITION_WORKER_URL` in both Worker (for Discovery→Acquisition chain) and Vercel (for manual trigger from admin UI).

### Signal Processing (Manual or Optional Callback)

Signal processing runs on **Vercel** (uses AI SDK + OpenRouter) because Cloudflare Workers cannot run the AI extraction step. After Acquisition completes:

**Manual workflow (recommended for MVP):**

1. Run `POST /api/admin/pipeline/process` repeatedly until no more acquired docs (batch of 10 per call)
2. Run `POST /api/admin/pipeline/snapshot` with `{ date: "YYYY-MM-DD" }` for the date

**Optional: HTTP callback from Acquisition Worker**

To automate, add `SIGNAL_PROCESS_URL` to Worker secrets (e.g. `https://your-app.vercel.app/api/admin/pipeline/process`) and have the Worker call it with `Authorization: Bearer <token>` after acquisition. The Vercel API requires Clerk auth; use a service token or dedicated webhook route for Worker callbacks. See [SIGNAL-PROCESSING.md](SIGNAL-PROCESSING.md) for details.

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

**Signal processing — via Admin UI (Next.js API):**

```bash
# Process next batch of acquired documents (batch of 10)
fetch("/api/admin/pipeline/process", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
}).then(r => r.json()).then(console.log);

# Create daily snapshot
fetch("/api/admin/pipeline/snapshot", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ date: "2025-02-01" }),
}).then(r => r.json()).then(console.log);
```

## Troubleshooting

- **Database connection fails:** Ensure DATABASE_URL secret is set with Neon pooled connection string. See [Neon + Cloudflare Workers](https://neon.tech/docs/guides/cloudflare-workers).
- **R2 put fails:** Verify R2 bucket exists and binding is correct in wrangler.jsonc. Run `pnpm run infra:provision`.
- **Worker timeout:** On a paid plan you can set `limits.cpu_ms` in wrangler.jsonc for long-running discovery. CPU limits are not supported on the Workers free plan (omit `limits` to use the default 10ms CPU).
- **Secrets not found:** Run `pnpm run infra:secrets` or `wrangler secret put DATABASE_URL`, `OPENROUTER_API_KEY`, `FIRECRAWL_API_KEY`
- **Manual trigger returns 401:** Sign in to admin UI first (Clerk authentication required)
- **Worker /discover or /acquire returns 401:** Send `Authorization: Bearer <token>` or `x-discovery-token: <token>`. If the Worker chains to itself (Discovery→Acquisition), set `DISCOVERY_TRIGGER_TOKEN` on the Worker so self-calls include the Bearer token; see [Bearer auth (DISCOVERY_TRIGGER_TOKEN)](#bearer-auth-discovery_trigger_token).
- **Acquisition not triggered after discovery:** Set `ACQUISITION_WORKER_URL` in Worker env (wrangler secret or vars)
- **Document content returns 503:** Set R2\_\* env vars in Vercel for S3 API; see [ACQUISITION.md](ACQUISITION.md)

## CI Integration (e.g. GitHub Actions)

Scripts are runnable in CI. Typical flow:

1. **Provision** (once or per env): `ENV=prod pnpm run infra:provision` — creates R2 bucket only; idempotent.
2. **Secrets**: Set `DATABASE_URL`, `OPENROUTER_API_KEY`, `FIRECRAWL_API_KEY` via repo/org secrets and run `wrangler secret put` in CI, or use `pnpm run infra:secrets` with non-interactive input (e.g. from env vars) if you add a CI mode.
3. **Deploy**: `ENV=prod pnpm run infra:deploy` — uses `wrangler deploy --env prod` with secrets already set (from dashboard or previous step).

Required CI secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (for wrangler). Optional: copy `.env.infra.example` to `.env.infra` and set values for scripted runs.

## References

- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Neon + Cloudflare Workers](https://neon.tech/docs/guides/cloudflare-workers)
- [R2 Bindings](https://developers.cloudflare.com/r2/api/workers/workers-api/)
- [Workers Queues](https://developers.cloudflare.com/queues/)
