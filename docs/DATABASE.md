# AGI Canary Watcher - Database

Database schema, migrations, and usage. Schema is defined in code (Drizzle ORM) and applied via migrations to **Neon Postgres**. See [docs/features/01-database-schema.md](features/01-database-schema.md) for full requirements.

## Stack

- **ORM:** Drizzle ORM
- **Database:** Neon Postgres (serverless)
- **Driver:** `@neondatabase/serverless` (HTTP; used by Vercel app and Cloudflare Workers)
- **Validation:** Zod (see `src/lib/db/validators.ts`)

## Schema Overview

| Table                | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `sources`            | Trusted data sources (tier, cadence, health)       |
| `pipeline_runs`      | Each pipeline execution (status, counts)           |
| `items`              | Discovered URLs (dedup by `url_hash`)              |
| `documents`          | Acquired content (R2 blob keys)                    |
| `signals`            | Extracted claims → capability axes                 |
| `daily_snapshots`    | Daily aggregated axis scores & canary status       |
| `canary_definitions` | Canary config (id, thresholds, display_order)      |
| `timeline_events`    | Timeline entries (reality / fiction / speculative) |

Relations: `sources` → `items`, `pipeline_runs` → `items`, `items` → `documents`, `documents` → `signals`. `daily_snapshots` references `signals` via `signal_ids` (uuid[]).

## Enums

- **source_tier:** TIER_0, TIER_1, DISCOVERY
- **cadence:** daily, weekly, monthly
- **domain_type:** evaluation, policy, research, commentary
- **source_type:** rss, search, curated, api, x
- **pipeline_run_status:** running, completed, failed
- **item_status:** pending, acquired, processed, failed
- **timeline_event_type:** reality, fiction, speculative

## JSONB Shapes (documented)

- **signals.axes_impacted:** `Array<{ axis, direction, magnitude, uncertainty? }>`
- **signals.metric:** `{ name, value, unit? }`
- **signals.citations:** `Array<{ url, quoted_span? }>`
- **daily_snapshots.axis_scores:** `Record<Axis, { score, uncertainty?, delta? }>`
- **daily_snapshots.canary_statuses:** `Array<{ canary_id, status, last_change?, confidence? }>`
- **canary_definitions.thresholds:** `{ green?, yellow?, red? }`

## Usage in App

```ts
import { getDb } from "@/lib/db";

// In API routes or server components (env available)
const db = getDb();
const runs = await db.select().from(pipelineRuns).limit(10);
```

In **Cloudflare Workers**, pass the connection string from the request context:

```ts
import { createDb } from "@/lib/db";
const db = createDb(env.DATABASE_URL);
```

## Migrations

1. **Generate** (after schema changes):  
   `pnpm run db:generate`

2. **Apply** (against Neon):  
   Set `DATABASE_URL` in `.env`, then:  
   `pnpm run db:migrate`

3. **Push** (dev only; no migration files):  
   `pnpm run db:push`

4. **Studio:**  
   `pnpm run db:studio`

## Seed

With `DATABASE_URL` set and migrations applied:

```bash
pnpm run db:seed
```

Seeds: canary definitions (e.g. arc_agi, long_horizon, safety_canary), one sample source, and sample timeline events.

## RLS (Row-Level Security)

All tables have RLS enabled with a permissive policy for `public` (allow all) so the app and Workers can read/write. When Clerk is added, policies should be tightened (e.g. restrict admin-only tables to authenticated roles).

## Capability Axes (reference)

The nine axes used in signals and daily_snapshots:

- reasoning, learning_efficiency, long_term_memory, planning, tool_use
- social_cognition, multimodal_perception, robustness, alignment_safety
