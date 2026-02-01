# R2 Infrastructure Management

## Goal

Provide reproducible, script-based management of R2 buckets for document storage. Pipeline runs on Vercel; Cloudflare is used only for R2. This ensures consistent setup across dev/staging/prod.

## User Story

As a developer setting up the AGI Canary pipeline, I want to run infrastructure scripts that provision R2 buckets, so that I can avoid manual dashboard configuration and support multiple environments.

## Functional Requirements

1. **Provisioning Scripts**

   - `pnpm run infra:provision` — Create R2 bucket; idempotent on re-run
   - `pnpm run infra:teardown` — Remove R2 bucket with confirmation prompt

2. **Environment Handling**

   - Support `dev`, `staging`, `prod` via `--env` flag or `ENV` variable
   - Separate R2 bucket names per env: `agi-canary-documents-dev`, `agi-canary-documents-staging`, `agi-canary-documents-prod`

3. **Resource Provisioning**

   - **R2 bucket:** `wrangler r2 bucket create <name>` (or check existence, skip if exists)

4. **Documentation**

   - `docs/INFRASTRUCTURE.md` — Prerequisites, setup steps, env vars, troubleshooting

5. **Vercel Configuration**

   - All pipeline env vars (DATABASE_URL, OPENROUTER_API_KEY, FIRECRAWL_API_KEY, R2_*, CRON_SECRET) set in Vercel project settings

## Config Files

- `scripts/infra-provision.ts` — Idempotent R2 bucket creation
- `scripts/infra-teardown.ts` — Remove R2 bucket with confirmation

**package.json scripts:**

```json
"infra:provision": "tsx scripts/infra-provision.ts",
"infra:teardown": "tsx scripts/infra-teardown.ts"
```

## User Flow

### Initial Setup

1. Developer runs `pnpm run infra:provision -- --env=dev` to create R2 bucket
2. Developer creates R2 API token in Cloudflare dashboard (Object Read & Write)
3. Developer sets env vars in Vercel (DATABASE_URL, OPENROUTER_API_KEY, FIRECRAWL_API_KEY, R2_*, CRON_SECRET)
4. Deploy to Vercel — pipeline runs via cron

### Teardown

1. Developer runs `pnpm run infra:teardown -- --env=dev`
2. Script prompts: "Remove R2 bucket for dev? (y/N)"
3. On confirm, deletes R2 bucket only
4. Does not touch Neon database or Vercel

## Acceptance Criteria

- [x] `infra:provision` creates R2 bucket; idempotent on re-run
- [x] Multiple environments supported with separate bucket names
- [x] docs/INFRASTRUCTURE.md documents full setup, prerequisites, troubleshooting
- [x] `infra:teardown` requires confirmation before destructive actions

## Edge Cases

1. **R2 bucket already exists**

   - Expected behavior: Skip creation
   - Handling strategy: `wrangler r2 bucket list`; continue if exists

2. **Wrong account or project**
   - Expected behavior: Script may create resources in wrong place
   - Handling strategy: Document `wrangler login` and account selection

## Non-Functional Requirements

**Technical:**

- Scripts use pnpm/tsx for wrangler; no global install required
