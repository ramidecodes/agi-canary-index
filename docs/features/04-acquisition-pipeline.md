# Content Acquisition Pipeline

**Implemented:** Acquisition lib at `src/lib/acquisition/`; document content at `GET /api/admin/documents/[id]/content`; manual trigger at `POST /api/admin/pipeline/acquire`; cron runs acquisition after discovery. Requires `FIRECRAWL_API_KEY` and R2 (S3 API). See [docs/ACQUISITION.md](../ACQUISITION.md) for implementation guide.

## Implementation Details

| Component           | Location                                                   |
| ------------------- | ---------------------------------------------------------- |
| Cron + manual       | `src/app/api/pipeline/cron/`, `api/admin/pipeline/acquire` |
| Orchestration       | `src/lib/acquisition/run.ts`                               |
| Firecrawl client    | `src/lib/acquisition/firecrawl.ts`                         |
| Validation          | `src/lib/acquisition/validate.ts`                          |
| Metadata extraction | `src/lib/acquisition/metadata.ts`                          |
| Manual trigger API  | `src/app/api/admin/pipeline/acquire/route.ts`              |
| Document content    | `src/app/api/admin/documents/[id]/content/route.ts`        |
| R2 client (app)     | `src/lib/r2.ts` (S3 API for R2)                            |

**Database:** `items` has `acquisition_attempt_count`, `acquisition_error`. Migration `0002_big_roxanne_simpson.sql`.

## Goal

Build the second stage of the data pipeline that fetches and cleans content from discovered URLs. The acquisition pipeline must:

- Process pending items from the discovery stage
- Fetch full page content via Firecrawl API
- Extract clean markdown and metadata
- Store raw and processed content in Cloudflare R2
- Prepare content for AI signal extraction

This pipeline transforms raw URLs into clean, structured documents ready for AI analysis.

## User Story

As the AGI Canary Watcher system, I want to fetch and clean content from discovered URLs, so that the AI processing pipeline has high-quality text to analyze.

## Functional Requirements

1. **Batch Processing**

   - Process pending items from current pipeline run
   - Batch size: 50 items per execution chunk
   - Respect Firecrawl rate limits
   - Continue on individual item failures

2. **Content Fetching via Firecrawl**

   - Use Firecrawl scrape endpoint for each URL
   - Request markdown output format
   - Extract metadata: title, author, published date, site name
   - Handle JavaScript-rendered pages
   - Timeout: 60 seconds per page

3. **Content Storage**

   - Store raw HTML in R2 (optional, for debugging)
   - Store clean markdown in R2
   - Generate unique blob keys (item_id based)
   - Compress content before storage

4. **Metadata Extraction**

   - Parse Open Graph tags
   - Extract article:published_time
   - Identify author/byline
   - Detect content type (article, paper, blog, report)

5. **Content Quality Validation**

   - Minimum content length: 200 characters
   - Maximum content length: 100,000 characters (truncate with warning)
   - Detect paywall/login walls
   - Flag low-quality extractions

6. **Status Management**

   - Update item status: pending → acquired → ready for processing
   - Track acquisition errors in item record
   - Retry failed items once per run
   - Mark permanently failed items after 3 total attempts

7. **Document Record Creation**
   - Create document record linked to item
   - Store R2 blob keys
   - Store extracted metadata as JSONB
   - Record word count and acquisition timestamp

## Data Requirements

**Uses Tables:**

- `items` - Read pending items, update status
- `documents` - Create document records
- `pipeline_runs` - Update processing counts

**Environment (Vercel):**

- **Neon:** Use `DATABASE_URL` in Vercel env; `drizzle-orm/neon-http` with `neon()`.
- **R2:** Use S3-compatible API with `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.

**External Services:**

- Firecrawl API (content fetching and cleaning)

**Execution Location:**

- Runs as Next.js API route on Vercel. Cron runs acquisition after discovery; manual trigger via Admin UI.

**Batch Processing (MVP):**

- Discovery calls Acquisition via HTTP with batch of pending item IDs. Acquisition processes batch, returns when done. For daily ~50-100 items, HTTP trigger is sufficient. Queues can be added later for retry/durability at scale.

## User Flow

### Automated Processing

1. Discovery pipeline completes, items in "pending" status
2. Acquisition picks up batch of 50 pending items
3. For each item:
   - Call Firecrawl scrape API with URL
   - On success:
     - Upload clean markdown to R2
     - Create document record with metadata
     - Update item status to "acquired"
   - On failure:
     - Log error in item record
     - Increment attempt counter
     - Keep status as "pending" or mark "failed" if max attempts
4. Update pipeline_run with items_processed count
5. If more pending items, process next batch
6. When all processed, acquisition phase complete

### Content Retrieval (for display)

1. UI requests document content
2. API reads document.clean_blob_key
3. Fetch markdown from R2
4. Return content (cached in edge)

## Acceptance Criteria

- [x] Firecrawl API integration working for standard web pages
- [x] Clean markdown extracted from articles, blog posts, papers
- [x] R2 storage working with proper key structure
- [x] Document records created with all metadata fields
- [x] Item status correctly transitions through pipeline
- [x] Failed items retry up to 3 times
- [x] Paywall detection flags protected content
- [x] Content truncation works for very long documents
- [x] Batch processing completes without timeout
- [ ] Average acquisition time: < 10 seconds per item (to validate)
- [x] R2 content retrievable for display

## Edge Cases

1. **Firecrawl rate limit exceeded**

   - Expected behavior: Pause processing, resume after cooldown
   - Handling strategy: Implement backoff, respect Retry-After header

2. **Page requires JavaScript**

   - Expected behavior: Firecrawl handles this
   - Handling strategy: Firecrawl's browser-based rendering

3. **Paywall or login required**

   - Expected behavior: Detect and flag, don't process further
   - Handling strategy: Check for common paywall indicators, mark item

4. **PDF or non-HTML content**

   - Expected behavior: Attempt extraction, flag format
   - Handling strategy: Firecrawl handles PDFs, store format type

5. **Very large page (>1MB)**

   - Expected behavior: Truncate content, log warning
   - Handling strategy: Take first 100k characters, note truncation

6. **Page no longer exists (404)**

   - Expected behavior: Mark as failed permanently
   - Handling strategy: No retry for 404/410 status codes

7. **Duplicate content (same text, different URL)**

   - Expected behavior: Process both, handle in signal extraction
   - Handling strategy: Content hashing can detect later, not blocked here

8. **Non-English content**

   - Expected behavior: Process anyway, AI will handle
   - Handling strategy: Detect language in metadata, flag if non-English

9. **R2 upload failure**
   - Expected behavior: Retry upload, fail item if persistent
   - Handling strategy: 3 upload retries with backoff

## Non-Functional Requirements

**Performance:**

- Single item acquisition: < 60 seconds (including Firecrawl)
- Batch of 50: < 10 minutes
- R2 upload: < 5 seconds per document
- Total daily volume: handle 200+ items

**Reliability:**

- Firecrawl failures don't crash pipeline
- R2 failures logged and retried
- Partial progress saved between batches

**Cost Efficiency:**

- Only fetch each URL once (deduplication)
- Compress content before R2 storage
- Don't store raw HTML unless debugging enabled

**Observability:**

- Log Firecrawl response times
- Track success/failure rates by source domain
- Alert on >20% failure rate

**Security:**

- API keys in environment only
- R2 bucket not publicly accessible
- Sanitize content before storage (no script injection)

**Technical:**

- Runs as Next.js API route on Vercel
- Chunked processing to avoid timeout
- Idempotent: re-running doesn't duplicate documents

**References:**

- [Cloudflare R2](https://developers.cloudflare.com/r2/)
