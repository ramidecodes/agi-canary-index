# Cloudflare Infrastructure Management

## Goal

Provide reproducible, script-based management of Cloudflare pipeline infrastructure so that R2, Hyperdrive, Queues, and Workers can be provisioned, updated, and torn down without manual dashboard steps. This ensures consistent setup across dev/staging/prod and enables CI/CD deployment.

## User Story

As a developer setting up or deploying the AGI Canary pipeline, I want to run infrastructure scripts that provision and deploy Cloudflare resources, so that I can avoid manual dashboard configuration and support multiple environments.

## Functional Requirements

1. **Wrangler-based Scripts**

   - `pnpm run infra:provision` — Create R2 bucket, Hyperdrive config, Queues (if used); idempotent on re-run
   - `pnpm run infra:deploy` — Deploy Workers via `wrangler deploy` with env selection
   - `pnpm run infra:secrets` — Interactive or scripted secret setup (prompts for values, runs `wrangler secret put`)
   - `pnpm run infra:teardown` — Remove resources with confirmation prompt

2. **Environment Handling**

   - Support `dev`, `staging`, `prod` via `--env` flag or `ENV` variable
   - Separate R2 bucket names per env: `canary-documents-dev`, `canary-documents-staging`, `canary-documents-prod`
   - Separate Queue names per env (if used)
   - Secrets scoped per wrangler environment

3. **Resource Provisioning**

   - **R2 bucket:** `wrangler r2 bucket create <name>` (or check existence, skip if exists)
   - **Hyperdrive:** `wrangler hyperdrive create <name> --connection-string="..."` — connection string from `.env.infra` or CI secret
   - **Queues:** `wrangler queues create <producer-name>`, `wrangler queues create <consumer-name>` (if using Queues)

4. **Documentation**

   - `docs/INFRASTRUCTURE.md` — Prerequisites, setup steps, env vars, troubleshooting
   - `.env.infra.example` — Template for infra-only values (NEON_CONNECTION_STRING, etc.); add to .gitignore

5. **CI Integration**
   - Scripts runnable in GitHub Actions or similar
   - Deploy step uses `wrangler deploy --env prod` with secrets from repo variables
   - Provision step uses `NEON_CONNECTION_STRING` from secrets for Hyperdrive creation

## Data Requirements

**Config Files:**

- `wrangler.jsonc` — Single config with `[env.dev]`, `[env.staging]`, `[env.prod]` overrides for bucket names, Hyperdrive IDs
- `scripts/infra-provision.ts` or `scripts/infra-provision.sh` — Idempotent provisioning
- `scripts/infra-deploy.sh` — Wrapper for `wrangler deploy --env $ENV`
- `.env.infra.example` — Template (not committed); contains `NEON_CONNECTION_STRING`, placeholders for API keys

**package.json scripts:**

```json
"infra:provision": "node scripts/infra-provision.js",
"infra:deploy": "scripts/infra-deploy.sh",
"infra:secrets": "node scripts/infra-secrets.js",
"infra:teardown": "node scripts/infra-teardown.js"
```

## User Flow

### Initial Setup

1. Developer clones repo, copies `.env.infra.example` to `.env.infra`
2. Developer adds `NEON_CONNECTION_STRING` (direct, non-pooled from Neon dashboard)
3. Developer runs `pnpm run infra:provision --env dev`
4. Script creates R2 bucket, Hyperdrive config; outputs config IDs
5. Developer updates wrangler.jsonc env overrides with Hyperdrive ID (or script does it)
6. Developer runs `pnpm run infra:secrets` — prompted for PERPLEXITY_API_KEY, FIRECRAWL_API_KEY
7. Developer runs `pnpm run infra:deploy --env dev`
8. Workers deploy; cron activates

### Deploy to Production

1. CI runs `pnpm run infra:deploy --env prod`
2. Uses wrangler deploy with prod bindings
3. Secrets already set via dashboard or previous CI run

### Teardown

1. Developer runs `pnpm run infra:teardown --env dev`
2. Script prompts: "Remove R2 bucket, Hyperdrive config for dev? (y/N)"
3. On confirm, deletes resources (Workers, R2, Hyperdrive config)
4. Does not touch Neon database

## Acceptance Criteria

- [ ] `infra:provision` creates R2 bucket and Hyperdrive config; idempotent on re-run
- [ ] `infra:deploy` deploys Workers to specified env (dev/staging/prod)
- [ ] Multiple environments supported with separate resources
- [ ] docs/INFRASTRUCTURE.md documents full setup, prerequisites, troubleshooting
- [ ] `.env.infra.example` exists; `.env.infra` in .gitignore
- [ ] CI (e.g. GitHub Actions) can run `infra:deploy` with secrets from repo variables
- [ ] `infra:teardown` requires confirmation before destructive actions
- [ ] Scripts work on macOS and Linux (or document Windows limitations)

## Edge Cases

1. **Hyperdrive already exists**

   - Expected behavior: Skip creation, use existing config ID
   - Handling strategy: Check via `wrangler hyperdrive list`; idempotent

2. **R2 bucket already exists**

   - Expected behavior: Skip creation
   - Handling strategy: `wrangler r2 bucket list`; continue if exists

3. **Missing NEON_CONNECTION_STRING**

   - Expected behavior: Fail with clear error
   - Handling strategy: Check env before Hyperdrive create; exit with instructions

4. **Partial teardown (only some resources exist)**

   - Expected behavior: Remove what exists, skip or warn for missing
   - Handling strategy: Try each resource; log success/failure per resource

5. **Wrong account or project**
   - Expected behavior: Script may create resources in wrong place
   - Handling strategy: Document `wrangler login` and account selection; consider account ID check

## Non-Functional Requirements

**Usability:**

- Scripts have `--help` or clear usage
- Error messages include next steps
- Idempotent where possible

**Security:**

- `.env.infra` never committed
- Secrets never logged or echoed
- Teardown requires explicit confirmation

**Technical:**

- Scripts use pnpm/npx for wrangler; no global install required
- Cross-platform where feasible (bash vs. Node.js)
