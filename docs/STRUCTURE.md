# AGI Canary Watcher - Project Structure

Directory layout and main entry points. Kept in sync with the codebase.

## Root

```
agi-canary-index/
├── drizzle/                 # Drizzle migrations and meta
├── docs/                     # Project documentation
├── public/                   # Static assets
├── src/
│   ├── app/                  # Next.js App Router
│   └── lib/                  # Shared libraries and services
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

- `layout.tsx` — Root layout
- `page.tsx` — Home page
- `globals.css` — Global styles
- **`admin/`** — Admin UI (Source Registry; auth via Clerk planned)
  - `layout.tsx` — Admin nav (Home, Sources)
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

### `src/components/`

- **`theme-provider.tsx`** — next-themes provider
- **`theme-toggle.tsx`** — Dark/light/system theme switcher
- **`ui/`** — shadcn components (button, input, table, badge, etc.)

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
- **`ai-models.ts`** — AI model IDs and config (see [MODELS.md](MODELS.md))

## `drizzle/`

- `*.sql` — Migration files (apply with `pnpm run db:migrate`)
- `meta/` — Drizzle Kit snapshots and journal

## `docs/`

- **`features/`** — FREDs (feature requirements)
- **`base-descriptions/`** — Base context for AI and product
- **AUTH.md** — Authentication (Clerk)
- **INFRASTRUCTURE.md** — Neon, Vercel, Cloudflare, R2
- **MODELS.md** — AI model IDs
- **STRUCTURE.md** — This file
- **DATABASE.md** — Schema, migrations, seed, JSONB shapes

## Scripts (from `package.json`)

| Script             | Description                    |
| ------------------ | ------------------------------ |
| `pnpm dev`         | Next.js dev server             |
| `pnpm build`       | Next.js build                  |
| `pnpm lint`        | Biome check                    |
| `pnpm format`      | Biome format                   |
| `pnpm db:generate` | Generate migration from schema |
| `pnpm db:migrate`  | Apply migrations               |
| `pnpm db:push`     | Push schema (dev)              |
| `pnpm db:studio`   | Drizzle Studio                 |
| `pnpm db:seed`     | Run seed script                |
