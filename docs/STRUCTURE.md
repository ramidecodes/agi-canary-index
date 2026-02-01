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
- **`api/canaries/route.ts`** — GET canary definitions with status
- **`api/timeline/recent/route.ts`** — GET recent timeline events
- **`api/movement/today/route.ts`** — GET today's significant changes
- **`api/stats/route.ts`** — GET public stats (source count)

### `src/components/`

- **`theme-provider.tsx`** — next-themes provider
- **`theme-toggle.tsx`** — Dark/light/system theme switcher
- **`home/`** — Home page (Control Room) components
  - `home-page-client.tsx` — Client wrapper with SWR data fetching
  - `home-header.tsx`, `home-footer.tsx`
  - `capability-radar.tsx` — D3 radar chart (9 axes)
  - `autonomy-thermometer.tsx`
  - `canary-strip.tsx` — Sticky canary indicators with popover
  - `todays-movement.tsx`, `timeline-preview.tsx`
- **`ui/`** — shadcn components (button, card, popover, tooltip, etc.)

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
