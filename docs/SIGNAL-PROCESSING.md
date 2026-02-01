# Signal Processing Pipeline

Implementation guide for the AI Signal Processing Pipeline (FRED: [05-signal-processing.md](features/05-signal-processing.md)). This stage runs on **Vercel** (Next.js API routes) and uses the Vercel AI SDK v6 with OpenRouter to extract structured capability signals from acquired documents.

## Overview

1. **Document queue** — Process documents with status "acquired" (batch of 10; Tier-0 first).
2. **AI extraction** — Fetch clean markdown from R2, call OpenRouter via AI SDK `generateObject()` with a Zod schema.
3. **Signal creation** — Map claims to `signals` table; adjust confidence by source `trust_weight`; filter below 0.3.
4. **Mark processed** — Set `documents.processedAt` and `items.status = 'processed'`.
5. **Daily snapshot** — Optional: aggregate signals for a date into `daily_snapshots` (axis scores).

## Location

- **App (Vercel):** `src/lib/signal/`, `src/app/api/admin/pipeline/process/`, `src/app/api/admin/pipeline/snapshot/`
- **Runs in:** Next.js API routes (Node.js); not in Cloudflare Workers.

## Environment (Vercel)

| Variable             | Purpose                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `OPENROUTER_API_KEY` | OpenRouter API key for signal extraction                                                                         |
| `R2_BUCKET_NAME`     | R2 bucket to read document content                                                                               |
| `DATABASE_URL`       | Neon pooled connection (read/write)                                                                              |
| R2 credentials       | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (and optional `R2_ENDPOINT`) for S3-compatible fetch |

Model ID is hardcoded in `src/lib/ai-models.ts` (`SIGNAL_EXTRACTION_MODEL`). See [MODELS.md](MODELS.md).

## API Routes

### POST `/api/admin/pipeline/process`

Trigger signal processing. Requires Clerk auth (admin).

- **Body (optional):** `{ documentIds?: string[] }` — If provided, only those documents (that are acquired and unprocessed) are processed. Otherwise, next batch of 10 (Tier-0 first) is processed.
- **Response:** `{ ok, documentsProcessed, documentsFailed, signalsCreated, durationMs, perDocument }`

### POST `/api/admin/pipeline/snapshot`

Create or update the daily snapshot for a date. Requires Clerk auth.

- **Body (optional):** `{ date?: string }` — `YYYY-MM-DD`; default is today.
- **Response:** `{ ok, date, signalCount, created }`

## Implementation Details

### Extraction schema (`src/lib/signal/schemas.ts`)

- **Claims:** Array of `{ claim_summary, classification, axes_impacted, benchmark?, confidence, citations }`.
- **Axes (9):** `reasoning`, `learning_efficiency`, `long_term_memory`, `planning`, `tool_use`, `social_cognition`, `multimodal_perception`, `robustness`, `alignment_safety`.
- **Direction:** `up` | `down` | `neutral`.
- **Classification:** `benchmark_result`, `policy_update`, `research_finding`, `opinion`, `announcement`, `other`.

### AI call (`src/lib/signal/extract.ts`)

- Uses `createOpenRouter({ apiKey })` from `@openrouter/ai-sdk-provider` and `generateObject()` from `ai`.
- Model: `openrouter(SIGNAL_EXTRACTION_MODEL)` (e.g. `anthropic/claude-sonnet-4.5`).
- On parse/validation failure or throw, returns `{ claims: [] }` (no retry with simpler prompt in current implementation; FRED allows one retry).

### Run logic (`src/lib/signal/run.ts`)

- **Query:** Documents with `processedAt` null, `cleanBlobKey` not null, joined with items (status `acquired`) and sources. Ordered by `sources.tier` then `documents.acquiredAt`; limit 10.
- **Per document:** Fetch content from R2 → `extractSignals()` → for each claim, `adjustedConfidence = confidence * Number(trustWeight)`; skip if `adjustedConfidence < 0.3` or no axes; insert into `signals`; then update `documents.processedAt` and `items.status = 'processed'`.
- **Parallelization:** Documents processed in parallel batches (CONCURRENCY=4) to improve throughput.
- **Scoring version:** Fixed `v1` (could later be read from `pipeline_runs.scoringVersion`).

### Snapshot (`src/lib/signal/snapshot.ts`)

- Selects signals where `createdAt::date = date`.
- For each of the 9 axes: score = confidence-weighted average of (direction × magnitude); uncertainty = average uncertainty.
- **Delta**: Day-over-day change; `delta = score - previousDayScore` for each axis.
- Upserts `daily_snapshots` by date (unique on `date`).

## Flow (manual or triggered)

1. **Discovery** (Worker) → **Acquisition** (Worker) → documents and items in "acquired" state.
2. **Process** (Vercel): call `POST /api/admin/pipeline/process` (optionally with `documentIds`). Repeats until no more acquired docs or use a scheduler.
3. **Snapshot** (Vercel): call `POST /api/admin/pipeline/snapshot` with `{ date: "YYYY-MM-DD" }` after processing for that day.

Triggering process from the Acquisition Worker (e.g. HTTP callback after acquire) is optional; see [00-feature-roadmap.md](features/00-feature-roadmap.md) (Acquire → API → AI).

## References

- [AI SDK generateObject](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-object)
- [OpenRouter Vercel AI SDK](https://openrouter.ai/docs/community/vercel-ai-sdk)
- [MODELS.md](MODELS.md) — Signal extraction model
