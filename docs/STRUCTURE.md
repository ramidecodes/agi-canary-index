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

Next.js 16 App Router: pages, layouts, and route handlers.

- `layout.tsx` — Root layout
- `page.tsx` — Home page
- `globals.css` — Global styles

### `src/lib/`

Shared code: DB, AI models, and future services.

- **`db/`** — Database (Drizzle + Neon)
  - `index.ts` — Client factory (`createDb`, `getDb`) and re-exports
  - `schema.ts` — Tables, enums, indexes, RLS policies
  - `relations.ts` — Drizzle relations
  - `validators.ts` — Zod schemas and inferred types
  - `seed.ts` — Seed script (`pnpm run db:seed`)
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
