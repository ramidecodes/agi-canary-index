# Acquisition Pipeline - Implementation Guide

The Acquisition Pipeline fetches full page content from discovered URLs via Firecrawl, validates it, stores clean markdown in R2, and creates document records for downstream AI signal extraction.

## Architecture

- **Next.js API** (`/api/admin/pipeline/acquire`) — Manual trigger (Clerk auth)
- **Cron** (`/api/pipeline/cron`) — Runs acquisition after discovery (first 50 items)
- **Acquisition Library** (`src/lib/acquisition/`) — Firecrawl client, validation, orchestration
- **Document Content API** (`/api/admin/documents/[id]/content`) — Fetch markdown from R2 for display
- **Firecrawl API** — Web scraping with markdown output
- **Cloudflare R2** — Document blob storage (S3-compatible API)

## How Acquisition Works

### Automated (Triggered by Cron)

1. **Cron runs** discovery, then acquisition for first 50 inserted items
2. **Acquisition processes** each item:
   - Call Firecrawl scrape API (60s timeout)
   - Validate content (min 200 chars, paywall detection, truncate at 100k)
   - Upload markdown to R2 at `documents/{itemId}/clean.md`
   - Create `documents` record with metadata and word count
   - Update `items.status` to `acquired`

### Manual Trigger

**Via Next.js API (Clerk-authenticated):**

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
  body: JSON.stringify({}),
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

- **Vercel**: Uses S3-compatible API with `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- **Blob key format**: `documents/{itemId}/clean.md`

## Environment Variables (Vercel)

| Variable               | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `FIRECRAWL_API_KEY`    | Firecrawl API key                                                  |
| `R2_ACCOUNT_ID`        | Cloudflare account ID                                              |
| `R2_ACCESS_KEY_ID`     | R2 API token (Object Read & Write)                                 |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret                                                |
| `R2_BUCKET_NAME`       | Bucket name (e.g. `agi-canary-documents-dev`)                      |
| `R2_ENDPOINT`          | Optional; defaults to `https://{account}.r2.cloudflarestorage.com` |

## Deployment

### Prerequisites

1. R2 bucket created: `pnpm run infra:provision -- --env dev`
2. Set `FIRECRAWL_API_KEY` and R2 vars in Vercel

### Local Testing

Run Next.js dev server and trigger from Admin UI (Pipeline → Run Acquisition).

## Observability

- **Response stats**: `itemsProcessed`, `itemsAcquired`, `itemsFailed`, `perItem` with success/error
- **Database**: `items.acquisition_attempt_count`, `items.acquisition_error`; `pipeline_runs.items_processed`, `items_failed`
- **Vercel Logs**: Function logs for acquisition route

## Limits

- **Batch size**: 50 items per invocation
- **Firecrawl timeout**: 60 seconds per URL
- **Function duration**: 5 minutes (Vercel `maxDuration`)

## Troubleshooting

| Issue                        | Solution                                                                |
| ---------------------------- | ----------------------------------------------------------------------- |
| "FIRECRAWL_API_KEY required" | Set in Vercel project settings                                          |
| R2 put fails                 | Verify bucket exists; check R2\_\* env vars; run `pnpm infra:provision` |
| Document content 503         | Set R2\_\* env vars in Vercel for S3 API access                         |
| Paywall false positives      | Review patterns in `src/lib/acquisition/validate.ts`                    |

## Next Steps

After Acquisition runs successfully:

1. **Signal Processing Pipeline** (FRED 05) — Extract capability signals with AI
2. **Signal Explorer UI** (FRED 10) — Display documents and extracted signals
