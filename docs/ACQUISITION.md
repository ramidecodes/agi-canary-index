# Acquisition Pipeline - Implementation Guide

The Acquisition Pipeline fetches full page content from discovered URLs via Firecrawl, validates it, stores clean markdown in R2, and creates document records for downstream AI signal extraction.

## Architecture

- **Cloudflare Worker** (`workers/pipeline/index.ts`) — `POST /acquire` handler
- **Acquisition Library** (`src/lib/acquisition/`) — Firecrawl client, validation, orchestration
- **Next.js API** (`/api/admin/pipeline/acquire`) — Manual trigger (proxies to Worker)
- **Document Content API** (`/api/admin/documents/[id]/content`) — Fetch markdown from R2 for display
- **Firecrawl API** — Web scraping with markdown output
- **Cloudflare R2** — Document blob storage (Worker binding; app uses S3 API)

## How Acquisition Works

### Automated (Triggered by Discovery)

1. **Discovery completes** and inserts new items with `status: pending`
2. **Discovery calls** Acquisition Worker with `itemIds` (first 50 of inserted)
3. **Acquisition processes** each item:
   - Call Firecrawl scrape API (60s timeout)
   - Validate content (min 200 chars, paywall detection, truncate at 100k)
   - Upload markdown to R2 at `documents/{itemId}/clean.md`
   - Create `documents` record with metadata and word count
   - Update `items.status` to `acquired`
4. **Chaining**: If 50+ items processed, Acquisition calls itself with `{ continue: true }` to process the next batch

### Manual Trigger

**Via Next.js API (Clerk-authenticated):**

Requires `ACQUISITION_WORKER_URL` in Vercel env.

```bash
# Process specific items
fetch("/api/admin/pipeline/acquire", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ itemIds: ["uuid1", "uuid2"] }),
}).then(r => r.json()).then(console.log);

# Process next 50 pending (no itemIds)
fetch("/api/admin/pipeline/acquire", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ continue: true }),
}).then(r => r.json()).then(console.log);
```

**Response:**

```json
{
  "ok": true,
  "itemsProcessed": 50,
  "itemsAcquired": 47,
  "itemsFailed": 3,
  "durationMs": 125000,
  "perItem": [
    { "itemId": "uuid", "success": true, "documentId": "doc-uuid" },
    { "itemId": "uuid", "success": false, "error": "Paywall detected" }
  ]
}
```

**Via Worker HTTP (optional token-gated):**

If `DISCOVERY_TRIGGER_TOKEN` is set:

```bash
curl -X POST https://agi-canary-pipeline.your-worker.workers.dev/acquire \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"continue": true}'
```

## Content Quality Validation

- **Minimum length**: 200 characters (reject shorter)
- **Maximum length**: 100,000 characters (truncate with `[Content truncated]`)
- **Paywall detection**: Regex patterns for common indicators (subscribe, login, paywall, premium, etc.)
- **404/410**: Mark as permanently failed (no retry)

## Status & Retry

- **Item status**: `pending` → `acquired` (success) or `failed` (permanent)
- **Retry**: Up to 3 attempts (`items.acquisition_attempt_count`)
- **Error logging**: `items.acquisition_error` stores last failure message

## Metadata Extraction

From Firecrawl response, we extract:

- Title, description, author, published time, site name
- Content type: `article` | `paper` | `blog` | `report` (heuristic from URL/title)
- Stored in `documents.extracted_metadata` (JSONB)

## Document Content Retrieval

For displaying document content in the UI (e.g., Signal Explorer):

```
GET /api/admin/documents/:documentId/content
```

Returns markdown with `Content-Type: text/markdown`. Requires Clerk auth. Uses R2 S3 API (`R2_*` env vars).

## R2 Storage

- **Worker**: Uses R2 binding `DOCUMENTS` (no credentials; `env.DOCUMENTS.put()`)
- **App**: Uses S3-compatible API with `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`
- **Blob key format**: `documents/{itemId}/clean.md`

## Environment & Secrets

### Worker (via `wrangler secret put`)

| Secret              | Description            |
| ------------------- | ---------------------- |
| `DATABASE_URL`      | Neon pooled connection |
| `FIRECRAWL_API_KEY` | Firecrawl API key      |

R2 binding configured in `wrangler.jsonc` (`r2_buckets`); no credentials needed.

### Vercel (for document fetch & manual trigger)

| Variable                  | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| `R2_ACCOUNT_ID`           | Cloudflare account ID                                              |
| `R2_ACCESS_KEY_ID`        | R2 API token (Object Read)                                         |
| `R2_SECRET_ACCESS_KEY`    | R2 API token secret                                                |
| `R2_BUCKET_NAME`          | Bucket name (e.g. `agi-canary-documents-dev`)                      |
| `R2_ENDPOINT`             | Optional; defaults to `https://{account}.r2.cloudflarestorage.com` |
| `ACQUISITION_WORKER_URL`  | Worker URL for manual trigger proxy                                |
| `DISCOVERY_TRIGGER_TOKEN` | Optional; passed to Worker when proxying                           |

## Deployment

### Prerequisites

1. R2 bucket created: `pnpm run infra:provision --env dev`
2. Secrets set: `pnpm run infra:secrets` (includes `FIRECRAWL_API_KEY`)

### Deploy Worker

```bash
pnpm run worker:deploy --env dev
```

### Chain Discovery → Acquisition

Set `ACQUISITION_WORKER_URL` as a Worker secret (same value as deploy URL, e.g. `https://agi-canary-pipeline-dev.xxx.workers.dev`). Discovery will then trigger Acquisition after inserting items.

### Local Testing

```bash
# Start Worker locally (requires R2 bucket + secrets)
pnpm worker:dev

# Trigger acquisition (another terminal)
curl -X POST http://localhost:8787/acquire \
  -H "Content-Type: application/json" \
  -d '{"continue": true}'
```

## Observability

- **Response stats**: `itemsProcessed`, `itemsAcquired`, `itemsFailed`, `perItem` with success/error
- **Database**: `items.acquisition_attempt_count`, `items.acquisition_error`; `pipeline_runs.items_processed`, `items_failed`
- **Cloudflare Logs**: `wrangler tail` for Worker logs

## Limits

- **Batch size**: 50 items per invocation
- **Firecrawl timeout**: 60 seconds per URL
- **CPU time**: 5 minutes per Worker invocation (shared with Discovery)

## Troubleshooting

| Issue                        | Solution                                                                   |
| ---------------------------- | -------------------------------------------------------------------------- |
| "FIRECRAWL_API_KEY required" | Run `pnpm infra:secrets` or `wrangler secret put FIRECRAWL_API_KEY`        |
| R2 put fails                 | Verify bucket exists; check `wrangler.jsonc` r2_buckets binding            |
| Acquisition not triggered    | Set `ACQUISITION_WORKER_URL` in Worker env; verify Discovery returns items |
| Document content 503         | Set R2\_\* env vars in Vercel for S3 API access                            |
| Paywall false positives      | Review patterns in `src/lib/acquisition/validate.ts`                       |

## Next Steps

After Acquisition runs successfully:

1. **Signal Processing Pipeline** (FRED 05) — Extract capability signals with AI
2. **Signal Explorer UI** (FRED 10) — Display documents and extracted signals
