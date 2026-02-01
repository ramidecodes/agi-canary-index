# Source Registry & Management

**Implemented:** Admin UI at `/admin/sources`; API at `/api/admin/sources`. Seed: `pnpm run db:seed` (16 Tier-0/Tier-1 + Discovery sources; upserts by name so re-running seed updates URLs and types). Auth via Clerk: `/admin` and `/api/admin` protected; sign-in at `/sign-in`. See [AUTH.md](../AUTH.md).

## Goal

Provide a curated, tiered registry of trusted data sources that feed the AGI Canary Watcher. The registry must:

- Distinguish between authoritative sources (Tier-0) and commentary (Tier-1)
- Enable source health monitoring (last success, error count, auto-disable)
- Support different fetch mechanisms (RSS, search API, curated pages, X/Twitter via Grok)
- Provide an admin interface for source management

This feature ensures the pipeline ingests high-quality, traceable information that maintains the application's epistemic credibility.

## User Story

As an administrator of the AGI Canary Watcher, I want to manage trusted data sources with tier classifications and health monitoring, so that the pipeline consistently ingests authoritative, high-quality signals.

## Functional Requirements

1. **Pre-configured Tier-0 Sources**

   - Stanford HAI (AI Index, news) — curated
   - METR (evaluations, blog) — RSS
   - ARC Prize (ARC-AGI updates) — RSS
   - OECD (AI Capability Indicators) — curated (may 403; no official RSS)
   - DeepMind Research — RSS (`deepmind.com/blog/rss.xml`)
   - OpenAI Research — RSS (`openai.com/news/rss.xml`)
   - Anthropic Research — RSS (`anthropic.com/news/feed_anthropic.xml`)
   - Epoch AI (trend analysis) — RSS
   - UK AISI (Frontier AI Trends) — curated
   - arXiv cs.AI — RSS (`rss.arxiv.org/rss/cs.AI`)
   - Google AI Blog — RSS (`research.google/blog/rss/`)
   - AI2 (Allen Institute) — curated (`blog.allenai.org`)

2. **Pre-configured Tier-1 Sources**

   - LessWrong
   - Alignment Forum
   - Import AI newsletter
   - Center for AI Safety

3. **Source Configuration**

   - Each source has: name, URL, tier, trust weight (0-1), cadence, domain type
   - Source type determines fetch strategy: RSS, search API, curated scrape, X (Grok, feature-flagged)
   - Query configuration for search-based sources (keywords, domains)
   - Active/inactive toggle without deletion

4. **Health Monitoring**

   - Track last successful fetch timestamp (sources.last_success_at)
   - Count consecutive failures (sources.error_count)
   - Auto-disable after N failures (configurable, default 5)
   - Status indicators derived from sources table (no separate fetch logs for MVP)

5. **Admin Interface**

   - List all sources with status indicators (green/yellow/red from last_success_at, error_count)
   - Add/edit/archive sources
   - Test fetch functionality
   - Manual refresh to update status (no aggressive polling)
   - Bulk enable/disable operations

6. **Trust Weight System**
   - Tier-0 sources: trust weight 0.8-1.0
   - Tier-1 sources: trust weight 0.5-0.7
   - Discovery sources: trust weight 0.3-0.5
   - Weight affects signal confidence calculations

## Data Requirements

**Uses Tables from 01-database-schema:**

- `sources` - Main source registry (last_success_at, error_count provide health status)

**Seed Data:**
Pre-populate sources table with the Tier-0/Tier-1/Discovery sources listed above. Seed upserts by name: re-running `pnpm run db:seed` updates URL, source_type, tier, etc. for existing sources without resetting `last_success_at` or `error_count`. Do not add "AI News (sample)" (example.com) to seed; if present in DB, deactivate or remove manually.

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
   - Source Type (dropdown: rss, search, curated, api, x)
   - Query Config (JSON editor, optional)
4. Admin fills form and clicks "Test Fetch"
5. System attempts to fetch from source, displays results preview
6. **If successful**: Admin clicks "Save", source is added as active
7. **If failed**: System shows error, admin adjusts config or cancels

### Monitoring Source Health

1. Admin views `/admin/sources` dashboard
2. Dashboard shows sources in cards/rows with:
   - Status indicator (green/yellow/red from last_success_at, error_count)
   - Last success timestamp
   - Error count badge
   - Trust weight display
3. Admin clicks "Refresh" to update status (or on page load)
4. Admin clicks on degraded source to:
   - Retry fetch manually (Test Fetch)
   - Edit configuration
   - Temporarily disable source

### Bulk Operations

1. Admin selects multiple sources via checkboxes
2. Admin chooses action: Enable All / Disable All / Change Tier
3. System confirms action
4. Changes applied atomically

## Acceptance Criteria

- [ ] Tier-0/Tier-1/Discovery sources seeded on deployment (16 in SEED_SOURCES; seed upserts by name)
- [ ] Admin can add new sources with all configuration options
- [ ] Test fetch validates source before saving
- [ ] Sources auto-disable after 5 consecutive failures
- [ ] Health dashboard shows status for all sources (from sources table)
- [ ] Trust weight correctly propagates to signal confidence
- [ ] Source changes take effect on next pipeline run
- [ ] Bulk operations complete in < 2 seconds
- [x] Admin interface protected; authentication via Clerk (see [AUTH.md](../AUTH.md))

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

## UI Stack

- **shadcn/ui** — Forms (Input, Label, Select, Textarea, Checkbox), tables (Table), badges (Badge), buttons (Button), breadcrumbs (Breadcrumb)
- **next-themes** — Dark/light mode toggle; theme persists across sessions
- **Sonner** — Toast notifications for async operations (success, error)

## Non-Functional Requirements

**Performance:**

- Source list load: < 200ms
- Test fetch timeout: 30 seconds max
- Bulk operations: < 2 seconds for 50 sources

**Security:**

- Admin-only access (Clerk authentication implemented; see [AUTH.md](../AUTH.md))
- API keys stored in environment variables, not in source config

**UX:**

- Clear status indicators (color-coded)
- Inline validation on form fields
- Confirmation dialogs for destructive actions
- Toast notifications for async operations

**Technical:**

- Server-side source management (no client-side secrets)
- Optimistic UI updates with rollback on failure
- Status via manual refresh or on page load (avoid aggressive polling)
- Admin runs on Vercel; uses `DATABASE_URL` (Neon pooled) for database access. Pipeline and app share env vars (OPENROUTER_API_KEY, FIRECRAWL_API_KEY) in Vercel.
