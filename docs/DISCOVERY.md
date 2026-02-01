# Discovery Pipeline - Implementation Guide

The Discovery Pipeline automatically finds relevant AI content from configured sources daily via Cloudflare Worker Cron triggers.

## Architecture

- **Cloudflare Worker** (`workers/pipeline/index.ts`) — Cron + HTTP handlers
- **Discovery Library** (`src/lib/discovery/`) — Fetch strategies (RSS, search, curated, X)
- **Next.js API** (`/api/admin/pipeline/discover`) — Manual trigger for testing
- **AI SDK v6** — Web search via OpenRouter provider (`@openrouter/ai-sdk-provider`)

## Discovery Sources

The pipeline fetches from 4 source types:

1. **RSS** — Parse RSS/Atom feeds (e.g., METR blog, LessWrong)
2. **Search** — Perplexity Sonar via OpenRouter (web search with AI SDK)
3. **Curated** — HTML link extraction from lab pages (e.g., Stanford HAI)
4. **X** — Grok via OpenRouter for Twitter/X posts (feature-flagged)

### Search Scope

The web search (`source_type: search`) covers broad AI ecosystem signals:

- AI research, policy, and benchmarks
- **Agent autonomy** (local agents, multi-agent systems, tool use)
- **Agent communities** (Moltbook, agent frameworks, MCP protocol)
- Model releases, infrastructure, and product launches
- Safety research and capability evaluations

The AI categorizes results (`capability`, `agent_autonomy`, `infrastructure`, `policy`, `community`, `research`, `product`) with rationale for context.

## How Discovery Works

### Automated (Daily Cron)

1. **6 AM UTC**: Cloudflare Cron triggers Worker `scheduled()` handler
2. **Check for in-progress runs**: Skip if a run is already executing
3. **Create pipeline_run**: Insert with `status: running`
4. **Fetch from sources** (parallel batches of 5):
   - Call appropriate fetcher based on `source_type`
   - Log to `source_fetch_logs` (success/failure, items_found)
   - Update `sources.last_success_at` and `error_count`
5. **Deduplicate**: Check `items.url_hash` for URLs seen in last 30 days
6. **Insert new items**: Write to `items` with `status: pending`
7. **Update pipeline_run**: Set `status: completed`, write counts
8. **(Optional) Trigger Acquisition**: HTTP call to Acquisition Worker if configured

### Manual Trigger (Admin)

For testing or forcing a run outside the schedule:

**Via Next.js API (Clerk-authenticated):**

```bash
# In browser console or authenticated request
fetch("/api/admin/pipeline/discover", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ dryRun: true }), // Optional: dryRun doesn't persist
})
  .then(r => r.json())
  .then(console.log);
```

Response:

```json
{
  "ok": true,
  "dryRun": true,
  "itemsDiscovered": 42,
  "itemsInserted": 35,
  "sourcesSucceeded": 12,
  "sourcesFailed": 1,
  "durationMs": 15234,
  "perSource": [
    {
      "sourceId": "uuid",
      "sourceName": "METR",
      "itemsFound": 3,
      "success": true
    }
    // ...
  ]
}
```

**Via Worker HTTP (optional token-gated):**

If `DISCOVERY_TRIGGER_TOKEN` is set:

```bash
curl -X POST https://agi-canary-pipeline.your-worker.workers.dev/discover \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Returns same JSON stats as above.

## URL Canonicalization

URLs are canonicalized before deduplication:

- Strip tracking params (`utm_*`, `fbclid`, `gclid`, etc.)
- Remove fragments (`#...`)
- Normalize protocol (prefer `https`)
- Lowercase hostname
- Sort query params

Hash: SHA-256 of canonical URL → `items.url_hash` for fast lookup.

## Deduplication Strategy

- Check `items.url_hash` for matches with `discovered_at > now() - 30 days`
- Skip recent duplicates
- Batch insert new URLs with `ON CONFLICT DO NOTHING` on `items.url`; returns IDs of inserted rows for acquisition trigger
- URLs older than 30 days can be rediscovered (future: "refresh candidates")

## Error Handling

- **Source failures**: Don't block other sources; log error, increment `sources.error_count`
- **Auto-disable**: Sources with `error_count >= 5` are flagged (manual re-enable via admin)
- **Partial success**: Pipeline completes if any source succeeds
- **Timeouts**: RSS/curated (30s), search (60s), X (45s) with retries

## Deployment

### Initial Setup

```bash
# 1. Set secrets (interactive)
pnpm infra:secrets
# Prompts for: DATABASE_URL, OPENROUTER_API_KEY, FIRECRAWL_API_KEY

# 2. Deploy Worker
pnpm worker:deploy
# Or: pnpm infra:deploy --env=dev

# 3. Verify cron is active
npx wrangler deployments list
```

### Testing Locally

```bash
# Test with wrangler dev (simulates cron)
pnpm worker:dev --test-scheduled

# In another terminal, trigger:
curl "http://localhost:8787/__scheduled?cron=0+6+*+*+*"
```

### Verify Cron

After deploy, check Cloudflare dashboard:

- Workers & Pages → agi-canary-pipeline → Triggers
- Cron should show: `0 6 * * *` (daily 6 AM UTC)
- Past Events table shows execution history

## Observability

- **Cloudflare Logs**: `wrangler tail` for live logs
- **Database**: Query `pipeline_runs` and `source_fetch_logs` for history
- **Metrics**: `items_discovered`, `sources_succeeded`, `sources_failed`, `duration_ms`

## Limits

- **CPU time**: 5 minutes (300,000ms) per invocation
- **Concurrent fetches**: 5 per batch (avoids subrequest limits)
- **Max items per RSS**: 500 (sorted by date, newest first)

## Troubleshooting

| Issue                         | Solution                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| Worker times out              | Check source fetch times; reduce concurrency or disable slow sources                             |
| "DATABASE_URL not set"        | Run `pnpm infra:secrets` or `wrangler secret put DATABASE_URL`                                   |
| Perplexity returns no results | Check OPENROUTER_API_KEY; verify quota on [openrouter.ai/credits](https://openrouter.ai/credits) |
| Duplicate URLs inserted       | Check `items.url` unique constraint; canonicalization may differ                                 |
| Source stuck in "red" health  | Reset `error_count` via admin or re-test fetch                                                   |

## Next Steps

After Discovery runs successfully:

1. **Acquisition Pipeline** (FRED 04) — Fetch full content and store to R2. See [ACQUISITION.md](ACQUISITION.md).
2. **Signal Processing** (FRED 05) — Extract capability signals with AI
