# Source Registry & Management

## Goal

Provide a curated, tiered registry of trusted data sources that feed the AGI Canary Watcher. The registry must:

- Distinguish between authoritative sources (Tier-0) and commentary (Tier-1)
- Enable source health monitoring and automatic failover
- Support different fetch mechanisms (RSS, search API, curated pages)
- Provide an admin interface for source management

This feature ensures the pipeline ingests high-quality, traceable information that maintains the application's epistemic credibility.

## User Story

As an administrator of the AGI Canary Watcher, I want to manage trusted data sources with tier classifications and health monitoring, so that the pipeline consistently ingests authoritative, high-quality signals.

## Functional Requirements

1. **Pre-configured Tier-0 Sources**

   - Stanford HAI (AI Index, news)
   - METR (evaluations, blog)
   - ARC Prize (ARC-AGI updates)
   - OECD (AI Capability Indicators)
   - DeepMind Research
   - OpenAI Research
   - Anthropic Research
   - Epoch AI (trend analysis)
   - UK AISI (Frontier AI Trends)
   - arXiv (filtered: cs.AI, cs.LG with keywords)

2. **Pre-configured Tier-1 Sources**

   - LessWrong
   - Alignment Forum
   - Import AI newsletter
   - Center for AI Safety

3. **Source Configuration**

   - Each source has: name, URL, tier, trust weight (0-1), cadence, domain type
   - Source type determines fetch strategy: RSS, search API, curated scrape
   - Query configuration for search-based sources (keywords, domains)
   - Active/inactive toggle without deletion

4. **Health Monitoring**

   - Track last successful fetch timestamp
   - Count consecutive failures
   - Auto-disable after N failures (configurable, default 5)
   - Alert mechanism for degraded sources

5. **Admin Interface**

   - List all sources with status indicators
   - Add/edit/archive sources
   - Test fetch functionality
   - View fetch history and error logs
   - Bulk enable/disable operations

6. **Trust Weight System**
   - Tier-0 sources: trust weight 0.8-1.0
   - Tier-1 sources: trust weight 0.5-0.7
   - Discovery sources: trust weight 0.3-0.5
   - Weight affects signal confidence calculations

## Data Requirements

**Uses Tables from 01-database-schema:**

- `sources` - Main source registry

**New Tables:**

### `source_fetch_logs`

History of fetch attempts per source.

- `id` (uuid, PK): Unique identifier
- `source_id` (uuid, FK → sources): Which source
- `run_id` (uuid, FK → pipeline_runs, nullable): Associated pipeline run
- `attempted_at` (timestamp): When fetch started
- `completed_at` (timestamp, nullable): When fetch ended
- `status` (enum: success, partial, failed): Result
- `items_found` (integer): URLs discovered
- `error_message` (text, nullable): Error details
- `response_time_ms` (integer, nullable): Latency

**Seed Data:**
Pre-populate sources table with the 14 Tier-0/Tier-1 sources listed above.

## User Flow

### Adding a New Source

1. Admin navigates to `/admin/sources`
2. Admin clicks "Add Source" button
3. System displays source configuration form:
   - Name (required)
   - URL (required)
   - Tier (dropdown: TIER_0, TIER_1, DISCOVERY)
   - Trust Weight (slider: 0.0-1.0)
   - Cadence (dropdown: daily, weekly, monthly)
   - Domain Type (dropdown: evaluation, policy, research, commentary)
   - Source Type (dropdown: rss, search, curated, api)
   - Query Config (JSON editor, optional)
4. Admin fills form and clicks "Test Fetch"
5. System attempts to fetch from source, displays results preview
6. **If successful**: Admin clicks "Save", source is added as active
7. **If failed**: System shows error, admin adjusts config or cancels

### Monitoring Source Health

1. Admin views `/admin/sources` dashboard
2. Dashboard shows sources in cards/rows with:
   - Status indicator (green/yellow/red)
   - Last success timestamp
   - Error count badge
   - Trust weight display
3. Admin clicks on degraded source
4. System shows fetch history with error logs
5. Admin can:
   - Retry fetch manually
   - Edit configuration
   - Temporarily disable source

### Bulk Operations

1. Admin selects multiple sources via checkboxes
2. Admin chooses action: Enable All / Disable All / Change Tier
3. System confirms action
4. Changes applied atomically

## Acceptance Criteria

- [ ] 14 pre-configured sources seeded on deployment
- [ ] Admin can add new sources with all configuration options
- [ ] Test fetch validates source before saving
- [ ] Sources auto-disable after 5 consecutive failures
- [ ] Health dashboard shows real-time status for all sources
- [ ] Fetch logs retained for 30 days minimum
- [ ] Trust weight correctly propagates to signal confidence
- [ ] Source changes take effect on next pipeline run
- [ ] Bulk operations complete in < 2 seconds
- [ ] Admin interface accessible only to authenticated admins

## Edge Cases

1. **RSS feed format changes**

   - Expected behavior: Fetch fails gracefully, logged
   - Handling strategy: Retry with backoff, alert admin after 3 failures

2. **Search API rate limits**

   - Expected behavior: Partial results accepted, retry scheduled
   - Handling strategy: Track quota usage, spread requests across run window

3. **Source URL redirects**

   - Expected behavior: Follow redirects up to 3 hops
   - Handling strategy: Update canonical URL if permanently redirected

4. **Duplicate sources (same content, different URL)**

   - Expected behavior: Items deduplicated at URL level
   - Handling strategy: Admin can mark sources as "shares content with"

5. **Source goes offline permanently**

   - Expected behavior: Source marked inactive, alerts sent
   - Handling strategy: Admin reviews and either archives or finds replacement

6. **arXiv keyword filter too broad**
   - Expected behavior: High volume of low-relevance items
   - Handling strategy: AI triage step marks items as "needs review"

## Non-Functional Requirements

**Performance:**

- Source list load: < 200ms
- Test fetch timeout: 30 seconds max
- Bulk operations: < 2 seconds for 50 sources

**Security:**

- Admin-only access (authentication required)
- API keys stored encrypted in environment variables, not in source config
- Audit log for all source modifications

**UX:**

- Clear status indicators (color-coded)
- Inline validation on form fields
- Confirmation dialogs for destructive actions
- Toast notifications for async operations

**Technical:**

- Server-side source management (no client-side secrets)
- Optimistic UI updates with rollback on failure
- Real-time status via polling (30-second interval)
