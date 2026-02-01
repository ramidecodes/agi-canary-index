# AGI Canary Watcher - Project Structure

Directory layout and main entry points. Kept in sync with the codebase.

## Root

```
agi-canary-index/
├── drizzle/                 # Drizzle migrations and meta
├── docs/                     # Project documentation
├── public/                   # Static assets
├── scripts/                  # Infra scripts (provision, deploy, secrets)
├── workers/pipeline/         # Cloudflare Worker (Discovery + Acquisition)
├── wrangler.jsonc            # Cloudflare Worker config (cron, env overrides)
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
- `page.tsx` — Home page (Control Room; radar, canaries, movement, timeline)
- **`capabilities/page.tsx`** — Capability Profile page (radar, time scrubber, domain breakdown, source map, axis detail modal)
- **`autonomy/page.tsx`** — Autonomy & Risk page (gauge, risk canaries, trigger log, coverage meter, historical chart)
- **`timeline/page.tsx`** — Timeline page (AI milestones, time navigation, filters, event detail sheet)
- `globals.css` — Global styles
- **`sign-in/[[...sign-in]]/page.tsx`** — Clerk sign-in page
- **`sign-up/[[...sign-up]]/page.tsx`** — Clerk sign-up page
- **`admin/`** — Admin UI (Source Registry; protected by Clerk)
  - `layout.tsx` — Admin nav (Home, Sources, UserButton, ThemeToggle)
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
- **`api/admin/pipeline/`** — Pipeline triggers
  - `discover/route.ts` — POST manual discovery (body: `{ dryRun?: boolean }`)
  - `acquire/route.ts` — POST manual acquisition (proxies to Worker)
  - `process/route.ts` — POST signal processing (body: `{ documentIds?: string[] }`); AI extraction, signal creation
  - `snapshot/route.ts` — POST daily snapshot (body: `{ date?: string }`); aggregates signals for date
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
- **`api/signals/route.ts`** — GET signals (query: axis, date, limit)
- **`api/signals/recent/route.ts`** — GET recent signals for autonomy axes (query: axes, limit)
- **`api/canaries/route.ts`** — GET canary definitions with status (query: type=risk for risk canaries only)
- **`api/autonomy/`** — Autonomy & Risk APIs
  - `current/route.ts` — GET current autonomy level and uncertainty
  - `history/route.ts` — GET historical autonomy levels (query: days)
  - `coverage/route.ts` — GET evaluation coverage metrics
- **`api/timeline/`** — Timeline APIs
  - `route.ts` — GET events in range (query: start, end, category)
  - `recent/route.ts` — GET recent timeline events (query: limit)
  - `event/[id]/route.ts` — GET single event by ID
  - `categories/route.ts` — GET distinct categories (reality events)
  - `search/route.ts` — GET search results (query: q)
- **`api/movement/today/route.ts`** — GET today's significant changes
- **`api/stats/route.ts`** — GET public stats (source count)

### `src/components/`

- **`theme-provider.tsx`** — next-themes provider
- **`theme-toggle.tsx`** — Dark/light/system theme switcher
- **`home/`** — Home page (Control Room) components
  - `home-page-client.tsx` — Client wrapper with SWR data fetching
  - `home-header.tsx`, `home-footer.tsx`
  - `capability-radar.tsx` — Declarative SVG radar (9 axes); optional onAxisClick for profile page
  - `autonomy-thermometer.tsx`
  - `canary-strip.tsx` — Sticky canary indicators with popover
  - `todays-movement.tsx`, `timeline-preview.tsx`
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
- **`ui/`** — shadcn components (button, card, dialog, slider, popover, tooltip, collapsible, etc.)

### `src/lib/`

Shared code: DB, AI models, and future services.

- **`db/`** — Database (Drizzle + Neon)
  - `index.ts` — Client factory (`createDb`, `getDb`) and re-exports
  - `schema.ts` — Tables, enums, indexes, RLS policies
  - `relations.ts` — Drizzle relations
  - `validators.ts` — Zod schemas and inferred types (incl. updateSourceSchema, bulkSourcesActionSchema)
  - `seed.ts` — Seed script (`pnpm run db:seed`); seeds 14 Tier-0/Tier-1 sources
- **`sources.ts`** — Source registry constants and helpers
  - `AUTO_DISABLE_FAILURE_THRESHOLD`, `getSourceHealthStatus()`, `SEED_SOURCES`
- **`auth.ts`** — Server-side auth for admin API routes (`requireAuth()`)
- **`ai-models.ts`** — AI model IDs and config (see [MODELS.md](MODELS.md))
- **`discovery/`** — Discovery pipeline (RSS, search, curated, X)
  - `run.ts` — Orchestration (sources → fetch → dedup → persist)
  - `url.ts` — URL canonicalization and hashing
  - `fetch-rss.ts`, `fetch-search.ts`, `fetch-curated.ts`, `fetch-x.ts`
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
- **`signal/`** — AI signal processing pipeline (AI SDK v6 + OpenRouter)
  - `schemas.ts` — Zod schemas for extraction output (claims, axes, citations)
  - `extract.ts` — AI extraction via `generateObject()` (OpenRouter + SIGNAL_EXTRACTION_MODEL)
  - `run.ts` — Orchestration (acquired docs → R2 fetch → extract → signals, mark processed)
  - `snapshot.ts` — Daily snapshot aggregation (axis scores from signals)
  - `index.ts` — Re-exports
- **`r2.ts`** — R2 S3 client for document fetch (Next.js app)

### `src/middleware.ts`

Clerk middleware: protects `/admin(.*)` and `/api/admin(.*)`; unauthenticated requests to those routes are redirected to sign-in. See [AUTH.md](AUTH.md).

## `drizzle/`

- `*.sql` — Migration files (apply with `pnpm run db:migrate`)
- `meta/` — Drizzle Kit snapshots and journal

## `docs/`

- **`features/`** — FREDs (feature requirements)
- **`base-descriptions/`** — Base context for AI and product
- **AUTH.md** — Authentication (Clerk)
- **DATABASE.md** — Schema, migrations, seed, JSONB shapes
- **INFRASTRUCTURE.md** — Neon, Vercel, Cloudflare, R2
- **DISCOVERY.md** — Discovery pipeline implementation guide
- **ACQUISITION.md** — Acquisition pipeline implementation guide
- **SIGNAL-PROCESSING.md** — Signal processing pipeline (AI extraction, snapshot)
- **MODELS.md** — AI model IDs
- **CAPABILITY-PROFILE.md** — Capability Profile page, APIs, Recharts usage
- **AUTONOMY-RISK.md** — Autonomy & Risk page, APIs, Recharts vs D3 evaluation
- **TIMELINE.md** — Timeline page, APIs, event categories
- **STRUCTURE.md** — This file

## Scripts (from `package.json`)

| Script                 | Description                    |
| ---------------------- | ------------------------------ |
| `pnpm dev`             | Next.js dev server             |
| `pnpm build`           | Next.js build                  |
| `pnpm lint`            | Biome check                    |
| `pnpm format`          | Biome format                   |
| `pnpm db:generate`     | Generate migration from schema |
| `pnpm db:migrate`      | Apply migrations               |
| `pnpm db:push`         | Push schema (dev)              |
| `pnpm db:studio`       | Drizzle Studio                 |
| `pnpm db:seed`         | Run seed script                |
| `pnpm worker:dev`      | Run pipeline Worker locally    |
| `pnpm worker:deploy`   | Deploy pipeline to Cloudflare  |
| `pnpm infra:provision` | Create R2 bucket               |
| `pnpm infra:deploy`    | Deploy Workers                 |
| `pnpm infra:secrets`   | Set wrangler secrets           |
