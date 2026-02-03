# Pipeline Runner: GitHub Actions (Deprecate Cloudflare Workers)

**Status:** Implemented. The ETL pipeline runs on GitHub Actions (scheduled and manual) instead of Cloudflare Workers. Cloudflare Workers pipeline code has been removed.

## Goal

Run the full ETL pipeline (discover → fetch → extract → map → aggregate) on **free-tier infrastructure**. Cloudflare Workers free plan enforces a 10 ms CPU limit per request, which is too low for discovery or any heavy stage. GitHub Actions provides up to 6 hours per job and is free for public repositories (unlimited minutes) or ~2,000 minutes/month for private repos.

## User Story

As a maintainer of the AGI Canary pipeline, I want the pipeline to run on a schedule and complete all stages (discovery, acquisition, signal extraction, snapshot) without hitting CPU or timeout limits, using only free-tier services.

## Decision: Deprecate Cloudflare Workers for Pipeline

- **Cloudflare Workers (free):** 10 ms CPU per request; no practical way to run discovery or long-running stages.
- **GitHub Actions (free):** 6-hour max job duration; scheduled workflows via `schedule`; manual run via `workflow_dispatch`. Same Neon DB, same R2 (via S3 API), same pipeline stages.

The pipeline job queue (Neon `jobs` table), stage logic, and libraries (discovery, acquisition, signal) are unchanged. Only the **runner** changes: from a Cloudflare Worker (cron + `/run` self-kick) to a GitHub Actions workflow that runs a Node script and drains the queue in one process.

## Functional Requirements

### 1. GitHub Actions Workflow

- **File:** `.github/workflows/pipeline.yml`
- **Triggers:**
  - `schedule`: cron `0 3 * * *` (3:00 UTC daily). Per [GitHub Docs](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule), scheduled workflows run on the default branch; use POSIX cron syntax (UTC).
  - `workflow_dispatch`: manual run from the Actions tab.
- **Job:** Single job on `ubuntu-latest` that checks out the repo, sets up Node and pnpm, installs dependencies, and runs the pipeline script.
- **Secrets:** All pipeline secrets are passed as GitHub repository (or environment) secrets: `DATABASE_URL`, `OPENROUTER_API_KEY`, `FIRECRAWL_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. Optional: `R2_ENDPOINT`.
- **Permissions:** Minimal; no `contents: write` or broad tokens unless required for a future step (e.g. triggering from API).

### 2. Pipeline Runner Script

- **File:** `scripts/run-pipeline-gha.ts`
- **Invocation:** `pnpm run pipeline:gha` (uses `tsx`).
- **Behavior:**
  1. Read config from `process.env` (in GHA, env is populated from secrets).
  2. Create DB client with `DATABASE_URL`; create R2 bucket adapter with `createR2Bucket()` from `src/lib/r2.ts`.
  3. **Cron/scheduled mode:** Create one pipeline run and enqueue one DISCOVER job (same semantics as the previous Worker `scheduled()` handler).
  4. **Process loop:** Release stale job locks (e.g. 15 min), claim a batch of jobs, process each with `processJob(job, env, db)` (from `src/lib/pipeline/stages.ts`), mark done or failed; repeat until no ready jobs remain or a time budget (e.g. 30–60 min) is reached.
- **Env shape:** Build an object compatible with the stage processors: `DATABASE_URL`, `OPENROUTER_API_KEY`, `FIRECRAWL_API_KEY`, `DOCUMENTS` (R2Bucket from `createR2Bucket()`), `BATCH_SIZE`, `TIME_BUDGET_MS`.

### 3. Shared Pipeline Library

- **Location:** `src/lib/pipeline/`
- **Modules:**
  - `db.ts`: Job queue operations (claimJobs, markJobDone, markJobFailed, releaseStaleJobLocks, countReadyJobs, enqueueJob, createPipelineRun). Same logic as before; imports from `@/lib/db/schema` and `@/lib/db`.
  - `stages.ts`: Stage processors (processDiscover, processFetch, processExtract, processMap, processAggregate). Accept an env object that includes `DOCUMENTS` (R2Bucket). No Cloudflare-specific types; R2 is provided by the caller (Worker binding or S3 client).
  - Optional `types.ts`: Export `PipelineEnv` (or equivalent) so both the GHA script and stages agree on the env shape.

### 4. Admin Pipeline Controls

- **Discover:** Admin "Run Discovery" creates a new pipeline run and enqueues a DISCOVER job in Neon (via `src/lib/pipeline/db.ts`). No Worker or external kick; the next scheduled or manually triggered GHA run will pick up the job. UI can show a message: "Discovery job enqueued. It will run on the next pipeline run (scheduled 3 AM UTC or trigger manually in Actions)."
- **Kick runner:** Removed or repurposed. To run the pipeline immediately, the user goes to GitHub Actions and triggers the workflow with `workflow_dispatch`. Optional future: API route that calls GitHub API to trigger `workflow_dispatch` (requires a GitHub token with `actions: write`).

### 5. Removal of Cloudflare Workers Pipeline

- Delete `workers/` directory (pipeline entry and stages were the only contents used for the pipeline).
- Delete `wrangler.jsonc` (or retain only if other Workers exist; for this project, remove).
- Remove from `package.json`: `worker:dev`, `worker:deploy`, `worker:deploy:prod`.
- Remove or update scripts and docs that reference the Worker: `scripts/infra-secrets.ts` (Worker secrets), `docs/WORKER-SETUP.md` (replace with pipeline-GHA docs), `docs/INFRASTRUCTURE.md` (pipeline section), `docs/STRUCTURE.md` (workers section).
- Remove API routes that proxy to the Worker: `/api/admin/worker/kick`. Update `/api/admin/pipeline/discover` to enqueue directly to the DB instead of calling the Worker `/jobs` and `/run`.

## Data Requirements

No schema changes. The pipeline continues to use the same Neon database, `jobs` and `pipeline_runs` tables, and the same claim/done/fail and stale-lock semantics.

## Security and Secrets

- GitHub Actions secrets are used only in the workflow and are not logged. Use repository or environment secrets for `DATABASE_URL`, `OPENROUTER_API_KEY`, `FIRECRAWL_API_KEY`, and all `R2_*` variables.
- No `INTERNAL_TOKEN` or Worker URL is required for the pipeline runner; the GHA job runs in a single process and does not need to call an external "run" endpoint.

## References

- [GitHub Actions – Workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub Actions – Events that trigger workflows (schedule, workflow_dispatch)](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [GitHub Actions – Using secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [docs/INFRASTRUCTURE.md](../INFRASTRUCTURE.md) – Updated to describe GHA as pipeline runner
- [docs/PIPELINE-GHA.md](../PIPELINE-GHA.md) – Setup and secrets for the GHA pipeline
