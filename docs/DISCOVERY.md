# Discovery Pipeline - Implementation Guide

The Discovery Pipeline automatically finds relevant AI content from configured sources daily via Vercel Cron.

## Architecture

- **Vercel Cron** — Daily 6 AM UTC triggers `/api/pipeline/cron` (Bearer `CRON_SECRET`)
- **Discovery Library** (`src/lib/discovery/`) — Fetch strategies (RSS, search, curated, X)
- **Next.js API** (`/api/admin/pipeline/discover`) — Manual trigger (Clerk auth)
- **AI SDK v6** — Web search via OpenRouter provider (`@openrouter/ai-sdk-provider`)

## Discovery Sources

The pipeline fetches from 4 source types:

1. **RSS** — Parse RSS/Atom feeds. Validated feeds include: METR blog, OpenAI News (`openai.com/news/rss.xml`), Anthropic News (`anthropic.com/news/feed_anthropic.xml`), DeepMind (`deepmind.com/blog/rss.xml`), arXiv cs.AI (`rss.arxiv.org/rss/cs.AI`), Google AI Blog (`research.google/blog/rss/`), LessWrong, Alignment Forum, Center for AI Safety.
2. **Search** — Perplexity Sonar via OpenRouter (web search with AI SDK)
3. **Curated** — HTML link extraction from lab pages (e.g., Stanford HAI, OECD AI, UK AISI, AI2 blog, Import AI). Note: Some curated pages may return 403 (e.g. OECD); use RSS where available.
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

1. **6 AM UTC**: Vercel Cron triggers `GET /api/pipeline/cron` with Bearer token
2. **Stale-run guard**: Mark any run stuck in `running` for more than 15 minutes as `failed` before starting.
3. **Check for in-progress runs**: Skip if a run is already executing.
4. **Create pipeline_run**: Insert with `status: running`.
5. **Fetch from sources** (parallel batches of 5, 60s timeout per source):
   - Call appropriate fetcher based on `source_type`; hung sources are logged as failure and do not block the run.
   - Log to `source_fetch_logs` (success/failure, items_found)
   - Update `sources.last_success_at` and `error_count`
6. **Deduplicate**: Check `items.url_hash` for URLs seen in last 30 days
7. **Insert new items**: Write to `items` with `status: pending`
8. **Update pipeline_run**: Set `status: completed`, write counts
9. **Finally**: If the run is still `running` (e.g. timeout or crash), mark it `failed` so it does not stay stuck.
10. **Trigger Acquisition**: Same request runs acquisition for first 50 inserted items (when not dry run)

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
- **Per-source timeout**: Each source fetch has a 60s timeout; hung fetches are logged as failure so the run can complete.
- **Stale-run guard**: Runs stuck in `running` for more than 15 minutes are marked `failed` before a new run starts.
- **Finally block**: When the handler exits, any run still `running` is marked `failed` (avoids stuck runs on timeout/crash).
- **Auto-disable**: Sources with `error_count >= 5` are flagged (manual re-enable via admin)
- **Partial success**: Pipeline completes if any source succeeds
- **Timeouts**: RSS/curated (30s per fetch), search (60s), X (45s) with retries; orchestration timeout 60s per source
- **Run failures**: If discovery throws, pipeline run is marked `failed` with `error_log`
- **RSS parse errors**: Malformed XML (e.g. "Attribute without value") is sanitized before parsing where possible

## Deployment

### Setup

1. Set environment variables in Vercel (see [INFRASTRUCTURE.md](INFRASTRUCTURE.md))
2. Set `CRON_SECRET` for Vercel Cron auth
3. Deploy to Vercel — cron activates automatically

### Verify Cron

In Vercel dashboard → Project → Cron Jobs: `0 6 * * *` (daily 6 AM UTC)

## Observability

- **Vercel Logs**: Function logs for `/api/pipeline/cron`
- **Database**: Query `pipeline_runs` and `source_fetch_logs` for history
- **Metrics**: `items_discovered`, `sources_succeeded`, `sources_failed`, `duration_ms`

## Limits

- **Function duration**: 5 minutes (Vercel `maxDuration`)
- **Concurrent fetches**: 5 per batch
- **Max items per RSS**: 500 (sorted by date, newest first)

## Troubleshooting

| Issue                               | Solution                                                                                                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Run stuck in "running"              | Stale-run guard (15 min) and `finally` block auto-mark stuck runs as failed. To fix an existing stuck run: `UPDATE pipeline_runs SET status = 'failed', completed_at = now(), error_log = 'Marked failed (stuck run)' WHERE status = 'running';` |
| Function times out                  | Check source fetch times; each source has 60s timeout; reduce concurrency or disable slow sources                                                                                                                                                |
| "DATABASE_URL not set"              | Set env vars in Vercel project settings                                                                                                                                                                                                          |
| Perplexity returns no results       | Check OPENROUTER_API_KEY; verify quota on [openrouter.ai/credits](https://openrouter.ai/credits)                                                                                                                                                 |
| Duplicate URLs inserted             | Check `items.url` unique constraint; canonicalization may differ                                                                                                                                                                                 |
| Source stuck in "red" health        | Reset `error_count` via admin or re-test fetch                                                                                                                                                                                                   |
| 403 on curated sources              | Switch to RSS where available (see SEED_SOURCES in `src/lib/sources.ts`); OECD and some lab pages may 403                                                                                                                                        |
| RSS parse "Attribute without value" | Pipeline sanitizes malformed XML attributes before parsing                                                                                                                                                                                       |

## Next Steps

After Discovery runs successfully:

1. **Acquisition Pipeline** (FRED 04) — Fetch full content and store to R2. See [ACQUISITION.md](ACQUISITION.md).
2. **Signal Processing** (FRED 05) — Extract capability signals with AI
