# Pipeline Infrastructure

## Goal

Define the Cloudflare infrastructure required for the AGI Canary data pipeline. The pipeline (Discovery, Acquisition) runs on Cloudflare Workers and requires wrangler configuration, bindings, and deployment setup. The app (Next.js) runs on Vercel—this FRED covers only the Cloudflare side of the hybrid architecture.

Without explicit infrastructure requirements, pipeline features cannot be implemented or deployed consistently.

## User Story

As a developer deploying the AGI Canary pipeline, I want a well-defined wrangler configuration and Cloudflare bindings, so that Discovery and Acquisition Workers can connect to Neon and R2 and run on schedule.

## Functional Requirements

1. **Deployment Architecture**

   - Hybrid approach only: Next.js on Vercel, pipeline on Cloudflare
   - No full-Cloudflare app deployment (no OpenNext/Cloudflare Pages for the app)
   - Pipeline Workers: Discovery, Acquisition (optionally Queue consumers)

2. **wrangler.jsonc Configuration**

   - `compatibility_date: "2025-03-07"`
   - `compatibility_flags: ["nodejs_compat"]`
   - `observability: { enabled: true, head_sampling_rate: 1 }`
   - Cron trigger: `triggers: { crons: ["0 6 * * *"] }` (daily at 6 AM UTC)
   - Worker entry point: `workers/pipeline/index.ts` or equivalent

3. **Neon Database (Neon Serverless Driver)**

   - Workers connect to Neon Postgres via [Neon serverless driver](https://neon.tech/docs/guides/cloudflare-workers) (`@neondatabase/serverless`)
   - Secret: `DATABASE_URL` (Neon pooled connection string) — set via `wrangler secret put DATABASE_URL`
   - Same connection string as Vercel app; use `drizzle-orm/neon-http` with `neon(env.DATABASE_URL)` in Workers
   - Reference: [Neon + Cloudflare Workers](https://neon.tech/docs/guides/cloudflare-workers)

4. **R2 Bucket Binding**

   - Binding: `DOCUMENTS` for document storage
   - Bucket name: configurable per environment (e.g. `canary-documents-dev`, `canary-documents-prod`)
   - Workers use `env.DOCUMENTS.put()` / `env.DOCUMENTS.get()` — no S3 API credentials

5. **Pipeline Orchestration (MVP)**

   - Discovery triggers Acquisition via HTTP (simpler for daily batch). No Queues required for MVP.
   - **Optional later:** Workers Queues for retry/durability; defer until needed.

6. **Worker Limits**

   - Default CPU: 30 seconds
   - Opt-in for longer runs: `limits: { cpu_ms: 300000 }` (5 minutes) for discovery/acquisition
   - Parallel fetches: max 5 concurrent to avoid subrequest limits

7. **Environment Strategy**
   - Secrets via `wrangler secret put`, never in wrangler.jsonc
   - Non-secret vars (e.g. `SCORING_VERSION`) in `vars` block
   - Environment-specific overrides via `[env.dev]`, `[env.staging]`, `[env.prod]`

## Data Requirements

**No new database tables.** This FRED defines infrastructure configuration.

**wrangler.jsonc skeleton:**

```jsonc
{
  "name": "agi-canary-pipeline",
  "main": "workers/pipeline/index.ts",
  "compatibility_date": "2025-03-07",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true, "head_sampling_rate": 1 },
  "triggers": { "crons": ["0 6 * * *"] },
  "r2_buckets": [{ "binding": "DOCUMENTS", "bucket_name": "canary-documents" }],
  "vars": { "SCORING_VERSION": "1.0.0" }
}
```

**Bindings Summary:**

- `DATABASE_URL` — Neon connection (via `wrangler secret put`; use with `@neondatabase/serverless`)
- `DOCUMENTS` — R2 bucket for document blobs

## User Flow

1. Developer runs `pnpm run infra:provision` (from FRED 14) to create R2 bucket
2. Developer sets secrets: `wrangler secret put DATABASE_URL`, `wrangler secret put OPENROUTER_API_KEY`, `wrangler secret put FIRECRAWL_API_KEY`
3. Developer runs `pnpm run infra:deploy` to deploy Workers
4. Cron triggers Discovery Worker daily at 6 AM UTC
5. Discovery writes to Neon, then triggers Acquisition via HTTP

## Acceptance Criteria

- [ ] wrangler.jsonc exists with required fields
- [ ] DATABASE_URL secret set and Workers connect to Neon via Neon serverless driver
- [ ] R2 binding configured; Workers can put/get objects
- [ ] Cron trigger fires at scheduled time
- [ ] Observability enabled (head_sampling_rate: 1)
- [ ] Secrets stored via wrangler secret, not in config
- [ ] Worker deploys successfully with `wrangler deploy`
- [ ] Compatibility date and flags match Cloudflare docs

## Edge Cases

1. **DATABASE_URL secret not set**

   - Expected behavior: Runtime error when Worker queries database
   - Handling strategy: Run `wrangler secret put DATABASE_URL` before deploy; document in INFRASTRUCTURE.md

2. **R2 bucket does not exist**

   - Expected behavior: Worker fails on first put
   - Handling strategy: Provision bucket via `wrangler r2 bucket create` before deploy

3. **Secrets not set**

   - Expected behavior: Worker fails at runtime when calling external APIs
   - Handling strategy: Document required secrets in INFRASTRUCTURE.md; CI checks before deploy

4. **Multiple environments (dev/staging/prod)**
   - Expected behavior: Separate bucket names per env; DATABASE_URL can be same or different per env
   - Handling strategy: wrangler environment overrides; secrets scoped per env; see FRED 14

## Non-Functional Requirements

**Technical:**

- Use wrangler.jsonc (not wrangler.toml) per Cloudflare recommendation
- Only include bindings that are used in the code
- Do not include dependencies in wrangler.jsonc

**Security:**

- API keys and connection strings never committed; use secrets or CI variables
- Least privilege: bindings only for required resources

**References:**

- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Neon + Cloudflare Workers](https://neon.tech/docs/guides/cloudflare-workers)
- [R2 Bindings](https://developers.cloudflare.com/r2/api/workers/workers-api/)
- [Workers Queues](https://developers.cloudflare.com/queues/)
