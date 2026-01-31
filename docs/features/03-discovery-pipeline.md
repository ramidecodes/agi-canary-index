# Discovery Pipeline

## Goal

Build the first stage of the data pipeline that discovers new candidate URLs from configured sources. The discovery pipeline must:

- Execute on a daily schedule via Cloudflare Worker Cron
- Aggregate URLs from RSS feeds, search APIs (Perplexity), and curated sources
- Deduplicate against previously seen content
- Produce a clean batch of candidate URLs for acquisition

This pipeline ensures the AGI Canary Watcher has fresh, relevant content to analyze without drowning in duplicates or low-quality noise.

## User Story

As the AGI Canary Watcher system, I want to automatically discover new relevant URLs from trusted sources daily, so that the acquisition pipeline has fresh content to process.

## Functional Requirements

1. **Scheduled Execution**

   - Run daily via Cloudflare Worker Cron trigger
   - Configurable run time (default: 6 AM UTC)
   - Manual trigger option for testing
   - Skip if previous run still in progress

2. **RSS Feed Discovery**

   - Fetch and parse RSS/Atom feeds from configured sources
   - Extract: URL, title, published date, source
   - Handle various RSS formats (RSS 2.0, Atom 1.0)
   - Respect feed update timestamps

3. **Perplexity Search Discovery**

   - Query Perplexity Search API with configured keywords
   - Keywords: "AGI evaluation", "AI benchmark", "ARC-AGI", "frontier model", "AI capability", "METR evaluation", "OECD AI"
   - Filter by recency (last 7 days)
   - Extract: URL, title, snippet, source domain

4. **Curated Source Discovery**

   - Check specific pages for new content (lab research pages, report indexes)
   - Compare against last known state
   - Detect new publications or updates

5. **URL Canonicalization**

   - Strip tracking parameters (utm\_\*, fbclid, etc.)
   - Remove fragments unless semantically meaningful
   - Normalize protocol (prefer https)
   - Generate consistent URL hash for deduplication

6. **Deduplication**

   - Check URL hash against items table
   - Skip URLs seen in past 30 days
   - Track "refresh" candidates (old URLs with new content signals)

7. **Batch Output**

   - Create pipeline_run record
   - Insert new items with status "pending"
   - Log discovery statistics per source
   - Return batch summary for monitoring

8. **Error Handling**
   - Continue on individual source failures
   - Log errors to source_fetch_logs
   - Increment source error_count on failure
   - Partial success is acceptable

## Data Requirements

**Uses Tables:**

- `sources` - Read active sources and their configurations
- `items` - Write new discovered items, check for duplicates
- `pipeline_runs` - Create run record, track progress
- `source_fetch_logs` - Log fetch attempts and results

**External Services:**

- Perplexity Search API (discovery)
- HTTP/RSS fetch (native)

**Environment Variables:**

- `PERPLEXITY_API_KEY` - API key for search
- `DISCOVERY_CRON_SCHEDULE` - Cron expression (default: "0 6 \* \* \*")

## User Flow

### Automated Daily Run

1. Cloudflare Worker Cron triggers at scheduled time
2. Worker checks for in-progress runs, skips if found
3. Worker creates new `pipeline_runs` record (status: running)
4. For each active source (in parallel batches of 5):
   - Based on source_type, execute appropriate fetch strategy
   - Log attempt to `source_fetch_logs`
   - On success: extract URLs, canonicalize, collect batch
   - On failure: log error, increment error_count, continue
5. Aggregate all discovered URLs
6. Deduplicate against existing items (URL hash lookup)
7. Insert new items with status "pending"
8. Update pipeline_run with statistics
9. Set pipeline_run status to "completed"
10. Return summary (for logging/monitoring)

### Manual Test Run

1. Admin calls `/api/admin/pipeline/discover` endpoint
2. Endpoint validates admin authentication
3. Executes same logic as scheduled run
4. Returns detailed results including per-source breakdown
5. Allows "dry run" mode that doesn't persist

## Acceptance Criteria

- [ ] Cron trigger executes reliably at configured time
- [ ] RSS feeds parsed correctly (test with 5+ different formats)
- [ ] Perplexity search returns relevant results
- [ ] URL canonicalization handles all common tracking params
- [ ] Deduplication prevents same URL from being added twice
- [ ] Source failures don't block other sources
- [ ] Pipeline run records created with accurate statistics
- [ ] Fetch logs capture success/failure per source
- [ ] Manual trigger works for admin testing
- [ ] Dry run mode available for validation
- [ ] Average run completes in < 5 minutes
- [ ] Handles 100+ new URLs per day without issues

## Edge Cases

1. **Perplexity API rate limit**

   - Expected behavior: Partial results used, warning logged
   - Handling strategy: Implement exponential backoff, cap retries at 3

2. **RSS feed returns 304 Not Modified**

   - Expected behavior: Skip feed, no new items expected
   - Handling strategy: Track ETag/Last-Modified headers, respect them

3. **URL canonicalization ambiguity**

   - Expected behavior: Consistent choice, may occasionally miss true duplicates
   - Handling strategy: Document canonicalization rules, allow manual merge later

4. **Source returns massive feed (1000+ items)**

   - Expected behavior: Process all but cap at 500 newest
   - Handling strategy: Sort by published date, take most recent

5. **Malformed RSS/XML**

   - Expected behavior: Fail gracefully for that source
   - Handling strategy: Try multiple parsers, log parsing errors

6. **Network timeout during fetch**

   - Expected behavior: Retry once, then fail
   - Handling strategy: 30-second timeout, single retry with backoff

7. **Concurrent cron triggers**
   - Expected behavior: Only one run executes
   - Handling strategy: Check for running status before starting, use mutex/lock

## Non-Functional Requirements

**Performance:**

- Total run time: < 5 minutes for standard source count
- Individual source fetch: < 30 seconds timeout
- Parallel fetches: up to 5 concurrent
- Database writes: batched, < 1 second for 100 items

**Reliability:**

- Partial success acceptable (some sources can fail)
- Automatic retry for transient failures
- Graceful degradation if Perplexity unavailable

**Observability:**

- Structured logging for all operations
- Metrics: items_discovered, sources_succeeded, sources_failed, duration
- Alerts on: complete failure, >50% source failures

**Security:**

- API keys in environment variables only
- No user input in this pipeline (all configured sources)
- Rate limit manual trigger endpoint

**Technical:**

- Cloudflare Worker for execution
- Uses Neon Postgres for state
- Idempotent operations where possible
