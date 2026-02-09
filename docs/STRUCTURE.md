# AGI Canary Watcher - Project Structure

Directory layout and main entry points. Kept in sync with the codebase.

Neon Project ID: young-boat-58197248

## Root

```
agi-canary-index/
├── .github/workflows/        # GitHub Actions (e.g. pipeline.yml for ETL)
├── drizzle/                 # Drizzle migrations and meta
├── docs/                     # Project documentation
├── public/                   # Static assets
├── scripts/                  # Infra scripts (provision R2, teardown, pipeline runner)
├── src/
│   ├── app/                  # Next.js App Router
│   ├── lib/                  # Shared libraries and services
│   └── middleware.ts         # Clerk auth: protect /admin and /api/admin
├── .env.example
├── drizzle.config.ts        # Drizzle Kit config (migrations)
├── next.config.ts
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

## `src/`

### `src/app/`

Next.js 16 App Router: pages, layouts, and route handlers. UI uses **shadcn/ui** and **next-themes**.

- `layout.tsx` — Root layout (ClerkProvider, ThemeProvider, Toaster)
- **`(main)/`** — Route group for main app (shared layout with header, footer, mobile bottom nav)
  - `layout.tsx` — MainLayoutClient (SiteHeader, main, SiteFooter, MobileBottomNav)
  - `page.tsx` — Home page (Control Room; radar, canaries, movement, timeline)
  - **`autonomy/page.tsx`** — Autonomy & Risk page (gauge, risk canaries, trigger log, coverage meter, historical chart)
  - **`news/page.tsx`** — News & Daily Brief page (archive, brief by date, article list, copy brief, share)
  - **`timeline/page.tsx`** — Timeline page (AI milestones, time navigation, filters, event detail sheet)
  - **`capabilities/page.tsx`** — Capability Profile page (radar, time scrubber, domain breakdown, source map, axis detail modal)
  - **`signals/page.tsx`** — Signal Explorer page (list, filters, detail sheet, export; desktop redirect banner on mobile)
  - **`about/page.tsx`** — About page (mission, architecture, principles)
  - **`methodology/page.tsx`** — Methodology page (frameworks, axes, pipeline)
  - **`sources/page.tsx`** — Data sources page (public list of trusted sources, grouped by tier)
- `globals.css` — Global styles (includes safe-area insets for mobile)
- **`sign-in/[[...sign-in]]/page.tsx`** — Clerk sign-in page
- **`sign-up/[[...sign-up]]/page.tsx`** — Clerk sign-up page
- **`admin/`** — Admin UI (Source Registry, Pipeline Controls; protected by Clerk)
  - `layout.tsx` — Admin nav (Home, Pipeline, Sources, UserButton, ThemeToggle)
  - **`pipeline/`** — Pipeline controls (manual triggers for discover, acquire, process, snapshot)
    - `page.tsx` — Step cards with trigger buttons, dry run, date picker
  - **`sources/`** — Source registry
    - `page.tsx` — List sources, health status, bulk actions
    - `source-form.tsx` — Shared form (add/edit) with test fetch
    - `new/page.tsx` — Add source
    - `[id]/edit/page.tsx` — Edit source
- **`api/admin/sources/`** — Source registry API
  - `route.ts` — GET list, POST create
  - `[id]/route.ts` — PATCH update
  - `test-fetch/route.ts` — POST test fetch (validate URL)
  - `bulk/route.ts` — POST bulk enable/disable/change tier
- **`api/admin/pipeline/`** — Pipeline triggers (Clerk auth)
  - `discover/route.ts` — POST manual discovery (body: `{ dryRun?: boolean }`); enqueues DISCOVER job (pipeline runs via GitHub Actions)
  - `acquire/route.ts` — POST manual acquisition (Firecrawl + R2)
  - `process/route.ts` — POST signal processing (body: `{ documentIds?: string[] }`); AI extraction, signal creation
  - `snapshot/route.ts` — POST daily snapshot (body: `{ date?: string }`); aggregates signals for date
- **`api/admin/jobs/`** — Job queue status API (Clerk auth)
  - `route.ts` — GET job counts by status/type, recent jobs, active runs
- **`api/admin/documents/[id]/content/`** — Document content
  - `route.ts` — GET markdown from R2
- **`api/snapshot/`** — Public snapshot API
  - `latest/route.ts` — GET latest daily snapshot
  - `history/route.ts` — GET snapshot history (query: days)
  - `[date]/route.ts` — GET snapshot for date (or nearest)
  - `range/route.ts` — GET min/max snapshot dates
- **`api/axis/[axis]/`** — Axis data for capability profile
  - `history/route.ts` — GET axis history (query: days)
  - `sources/route.ts` — GET sources contributing to axis
- **`api/signals/route.ts`** — GET signals (mode 1: axis+date for capability profile; mode 2: full explorer filters)
- **`api/signals/[id]/route.ts`** — GET single signal detail
- **`api/signals/export/route.ts`** — GET export filtered signals as CSV or JSON
- **`api/signals/recent/route.ts`** — GET recent signals for autonomy axes (query: axes, limit)
- **`api/canaries/route.ts`** — GET canary definitions with status (query: type=risk for risk canaries only)
- **`api/composite/route.ts`** — GET composite AGI progress score (0-100), breakdown, trend, top movers
- **`api/narrative/route.ts`** — GET template-based narrative summary (headline, summary, counts)
- **`api/autonomy/`** — Autonomy & Risk APIs
  - `current/route.ts` — GET current autonomy level and uncertainty (with confidence gate + hysteresis)
  - `history/route.ts` — GET historical autonomy levels (query: days)
  - `coverage/route.ts` — GET evaluation coverage metrics
- **`api/timeline/`** — Timeline APIs
  - `route.ts` — GET events in range (query: start, end, category)
  - `recent/route.ts` — GET recent **reality** timeline events (query: limit); home preview
  - `event/[id]/route.ts` — GET single event by ID
  - `categories/route.ts` — GET distinct categories (reality events)
  - `search/route.ts` — GET search results (query: q)
- **`api/movement/today/route.ts`** — GET today's significant changes
- **`api/brief/`** — Daily Brief APIs
  - `today/route.ts` — GET today's brief (movements, coverage, sources checked)
  - `[date]/route.ts` — GET brief for date (YYYY-MM-DD)
  - `archive/route.ts` — GET recent briefs list (query: limit)
- **`api/news/route.ts`** — GET paginated news articles (query: limit, cursor, dateFrom, dateTo, axis, sourceTier)
- **`api/news/filters/route.ts`** — GET filter options (axes, date range, source tiers)
- **`api/stats/route.ts`** — GET public stats (source count)
- **`api/sources/route.ts`** — GET public list of active data sources (no auth)

### `src/components/`

- **`theme-provider.tsx`** — next-themes provider
- **`theme-toggle.tsx`** — Dark/light/system theme switcher
- **`layout/`** — Shared app shell (DRY nav, mobile design; see docs/features/12-mobile-design.md)
  - `site-header.tsx` — Logo, tagline, Admin link (desktop), hamburger (mobile)
  - `site-footer.tsx` — Footer nav (desktop only; uses nav-config)
  - `mobile-bottom-nav.tsx` — Bottom tab bar (Home, Autonomy, News, Timeline, Signals); 44px touch targets
  - `mobile-nav-sheet.tsx` — Hamburger menu (secondary links, theme toggle)
  - `home-status-badges.tsx` — Status badges for home page (fetches snapshot/stats only on /)
  - `status-badges.tsx` — Status row (updated, sources, coverage, stale)
  - `desktop-redirect-banner.tsx` — "For full analysis, view on desktop" (mobile, e.g. signals page)
  - `index.ts` — Layout exports
- **`lib/layout/nav-config.ts`** — Single source of truth for primary/secondary/external nav items
- **`hooks/use-mobile.ts`** — useIsMobile() (viewport &lt; 640px) for conditional UI
- **`home/`** — Home page (Control Room) components
  - `home-page-client.tsx` — Client wrapper with SWR data fetching (no header/footer; layout provides)
  - `agi-progress-indicator.tsx` — Composite AGI progress gauge (0-100%) with zone labels, trend arrow, and week-over-week delta
  - `capability-radar.tsx` — Declarative SVG radar (9 axes); data-quality indicators (dashed for low-data axes); per-axis trend arrows; improved ghost visibility
  - `autonomy-thermometer.tsx` — 5-level gauge with contextual interpretation text, confidence gate, and "what's needed for next level"
  - `canary-strip.tsx` — Sticky canary indicators with status reasons, threshold details, and change history in popovers
  - `daily-brief-card.tsx` — Today's Movement with narrative interpretation (not raw deltas), summary header, and data-gap detection
  - `hero-section.tsx` — Hero with title, narrative headline from /api/narrative, AGI Progress Indicator, and radar
- **`news/`** — News & Daily Brief page components
  - `news-page-client.tsx` — Client wrapper with SWR, URL state (date, filters)
  - `copy-brief-button.tsx` — Copy brief as formatted text; fallback modal
  - `news-article-list.tsx` — Article cards (title, source, tags, why it matters, confidence)
- **`capabilities/`** — Capability Profile page components
  - `capability-profile-client.tsx` — Client wrapper, SWR, URL state
  - `time-scrubber.tsx` — Date slider + presets (shadcn Slider)
  - `domain-breakdown.tsx` — Axis list, progress bars, sort
  - `source-map-panel.tsx` — Sources for axis
  - `axis-detail-modal.tsx` — Dialog with Recharts line/area chart
  - `filter-toggles.tsx` — Benchmarks / claims / speculative (shadcn Checkbox)
- **`autonomy/`** — Autonomy & Risk page components
  - `autonomy-page-client.tsx` — Client wrapper with SWR data fetching
  - `autonomy-gauge.tsx` — Vertical autonomy scale (custom SVG)
  - `risk-canaries-panel.tsx` — Risk canaries with expandable details
  - `trigger-log.tsx` — Recent signals affecting autonomy
  - `evaluation-coverage-meter.tsx` — Eval coverage breakdown
  - `historical-autonomy-chart.tsx` — Recharts line/area chart
  - `interpretation-guide.tsx` — Collapsible guide
- **`timeline/`** — Timeline page components
  - `timeline-page-client.tsx` — Client wrapper, SWR, URL state
  - `timeline-visualization.tsx` — Horizontal scroll timeline with event markers
  - `timeline-filters.tsx` — Category checkboxes, search input
  - `time-navigation.tsx` — Quick-jump buttons (2020, 2022, 2024, Today)
  - `event-detail-sheet.tsx` — Shadcn Sheet with event details
- **`signals/`** — Signal Explorer page components
  - `signal-explorer-client.tsx` — Client wrapper, SWR, URL state
- **`sources/`** — Data sources page components
  - `data-sources-client.tsx` — Client wrapper, SWR fetch, table grouped by tier
  - `signal-filters.tsx` — Axis, date, tier, confidence filters
  - `signal-list-table.tsx` — Sortable table with row click
  - `signal-detail-sheet.tsx` — Shadcn Sheet with full signal details
- **`ui/`** — shadcn components (button, card, dialog, slider, popover, tooltip, collapsible, etc.)

### `src/lib/`

Shared code: DB, AI models, and future services.

- **`db/`** — Database (Drizzle + Neon)
  - `index.ts` — Client factory (`createDb`, `getDb`) and re-exports
  - `schema.ts` — Tables, enums, indexes, RLS policies
  - `relations.ts` — Drizzle relations
  - `validators.ts` — Zod schemas and inferred types (incl. updateSourceSchema, bulkSourcesActionSchema)
  - `seed.ts` — Seed script (`pnpm run db:seed`); upserts Tier-0/Tier-1/Discovery sources by name (27 in SEED_SOURCES)
- **`sources.ts`** — Source registry constants and helpers
  - `AUTO_DISABLE_FAILURE_THRESHOLD`, `getSourceHealthStatus()`, `SEED_SOURCES`
- **`auth.ts`** — Server-side auth for admin API routes (`requireAuth()`)
- **`ai-models.ts`** — AI model IDs and config (see [MODELS.md](MODELS.md))
- **`discovery/`** — Discovery pipeline (RSS, search, curated; Perplexity via OpenRouter, Firecrawl for acquisition)
  - `run.ts` — Orchestration (sources → fetch → dedup → persist)
  - `url.ts` — URL canonicalization and hashing
  - `fetch-rss.ts`, `fetch-search.ts`, `fetch-curated.ts`
- **`acquisition/`** — Content acquisition pipeline (Firecrawl, R2)
  - `run.ts` — Orchestration (scrape → validate → store → document)
  - `firecrawl.ts` — Firecrawl scrape API client
  - `validate.ts` — Content quality validation (length, paywall)
  - `metadata.ts` — Metadata extraction (OG, article tags)
- **`home/`** — Home page types and Zustand store
  - `types.ts` — Snapshot, Canary, TimelineEvent, Movement
  - `store.ts` — useHomeStore (radar axis, canary hover, radar days)
- **`timeline/`** — Timeline page types
  - `types.ts` — TimelineEvent, TimelineCategory
- **`capabilities/`** — Capability Profile state and types
  - `store.ts` — useCapabilityProfileStore (selectedDate, activeAxis, filters, sortBy)
  - `types.ts` — AxisHistoryPoint, AxisSourceEntry, SnapshotRange
- **`signals/`** — Signal Explorer query logic
  - `query.ts` — parseExplorerFilters, querySignalsExplorer (shared with API)
  - `types.ts` — SignalExplorerItem, SignalDetail, SignalClassification, AXIS_LABELS, TIER_LABELS, CLASSIFICATION_LABELS, CLASSIFICATION_COLORS
- **`brief/`** — Daily Brief & News
  - `types.ts` — DailyBrief, BriefItem, NewsArticle, NewsFiltersOptions
  - `build-brief.ts` — getBriefForDate, build movements from snapshot/signals
  - `news-query.ts` — queryNews (cursor-paginated articles from processed documents)
- **`signal/`** — AI signal processing pipeline (AI SDK v6 + OpenRouter)
  - `schemas.ts` — Zod schemas for extraction output (claims, axes, citations)
  - `extract.ts` — AI extraction via `generateObject()` (OpenRouter + SIGNAL_EXTRACTION_MODEL)
  - `run.ts` — Orchestration (acquired docs → R2 fetch → extract → signals, mark processed)
  - `snapshot.ts` — Daily snapshot aggregation with 7-day EMA smoothing, coverage_score, canary_statuses computation
  - `detect-events.ts` — Automated timeline event detection (threshold crossings, rapid movements, canary changes, benchmark results)
  - `index.ts` — Re-exports
- **`r2.ts`** — R2 S3 client for document fetch (Next.js app)
- **`pipeline/`** — ETL pipeline (job queue + stages); used by GitHub Actions runner and admin discover
  - `db.ts` — Job queue: claimJobs, markJobDone, markJobFailed, releaseStaleJobLocks, enqueueJob, createPipelineRun
  - `stages.ts` — Stage processors: DISCOVER, FETCH, EXTRACT, MAP, AGGREGATE
  - `types.ts` — PipelineEnv (DB, R2, API keys, batch config)
  - `index.ts` — Re-exports

### `src/middleware.ts`

Clerk middleware: protects `/admin(.*)` and `/api/admin(.*)`; unauthenticated requests to those routes are redirected to sign-in. See [AUTH.md](AUTH.md).

## `drizzle/`

- `*.sql` — Migration files (apply with `pnpm run db:migrate`)
- `meta/` — Drizzle Kit snapshots and journal

## `docs/`

- **`features/`** — FREDs (feature requirements)
  - **`16-home-page-layout-redesign.md`** — Home layout: primary row (Movement | Autonomy), context row (Timeline)
  - **`17-home-autonomy-level-component.md`** — Home autonomy: API, 5-level scale, visible fill
  - **`18-timeline-events-home-preview.md`** — Timeline recent: reality-only filter, seed/curation
- **`base-descriptions/`** — Base context for AI and product
- **AUTH.md** — Authentication (Clerk)
- **DATABASE.md** — Schema, migrations, seed, JSONB shapes
- **INFRASTRUCTURE.md** — Neon, Vercel, GitHub Actions, R2
- **GITHUB-ACTIONS-SETUP.md** — Step-by-step GitHub Actions pipeline configuration (secrets, manual run)
- **DISCOVERY.md** — Discovery pipeline implementation guide
- **ACQUISITION.md** — Acquisition pipeline implementation guide
- **SIGNAL-PROCESSING.md** — Signal processing pipeline (AI extraction, snapshot)
- **MODELS.md** — AI model IDs
- **CAPABILITY-PROFILE.md** — Capability Profile page, APIs, Recharts usage
- **AUTONOMY-RISK.md** — Autonomy & Risk page, APIs, Recharts vs D3 evaluation
- **TIMELINE.md** — Timeline page, APIs, event categories
- **SIGNAL-EXPLORER.md** — Signal Explorer page, APIs, filters, export
- **DAILY-BRIEF.md** — Daily Brief & News page, APIs, copy brief, share
- **STRUCTURE.md** — This file
- **features/20-pipeline-github-actions.md** — Pipeline on GitHub Actions (replaces Cloudflare Workers)

## `.github/workflows/`

- **`pipeline.yml`** — ETL pipeline: scheduled daily (3 AM UTC) and `workflow_dispatch`. Runs `pnpm run pipeline:gha` with Neon + R2 env.

## Scripts (from `package.json`)

| Script                         | Description                        |
| ------------------------------ | ---------------------------------- |
| `pnpm dev`                     | Next.js dev server                 |
| `pnpm build`                   | Next.js build                      |
| `pnpm lint`                    | Biome check                        |
| `pnpm format`                  | Biome format                       |
| `pnpm db:generate`             | Generate migration from schema     |
| `pnpm db:migrate`              | Apply migrations                   |
| `pnpm db:push`                 | Push schema (dev)                  |
| `pnpm db:studio`               | Drizzle Studio                     |
| `pnpm db:seed`                 | Run seed script                    |
| `pnpm infra:provision`         | Create R2 bucket                   |
| `pnpm infra:teardown`          | Remove R2 bucket for env           |
| `pnpm pipeline:gha`            | Run ETL pipeline (same as GHA job) |
| `pnpm pipeline:discover:local` | Run discovery only (local)         |
| `pnpm pipeline:acquire:local`  | Run acquisition only (local)       |
| `pnpm pipeline:signal:local`   | Run signal processing only (local) |
| `pnpm pipeline:snapshot:local` | Run snapshot only (local)          |
