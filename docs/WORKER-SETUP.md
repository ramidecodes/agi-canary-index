# Cloudflare Worker Setup Guide

This guide explains how to set up and deploy the Cloudflare Worker for the ETL pipeline, including production environment configuration.

## Prerequisites

1. **Cloudflare Account** - Sign up at [cloudflare.com](https://dash.cloudflare.com/sign-up)
2. **Wrangler CLI** - Already included in `devDependencies`
3. **Neon Database** - Pooled connection string (same as Vercel app)

## Initial Setup

### 1. Login to Cloudflare

```bash
pnpm exec wrangler login
```

This opens a browser to authenticate with Cloudflare.

### 2. Set Worker Secrets

Secrets are environment-specific and must be set separately for dev and prod.

#### Option A: Interactive Script (Recommended)

```bash
# For dev environment (default)
pnpm run infra:secrets

# For prod environment
pnpm run infra:secrets prod
```

The script will prompt you for:

- `DATABASE_URL` - Neon pooled connection string
- `OPENROUTER_API_KEY` - OpenRouter API key for AI calls
- `FIRECRAWL_API_KEY` - Firecrawl API key for content scraping
- `INTERNAL_TOKEN` - Auth token for `/run` and `/jobs` endpoints (generate with `openssl rand -hex 32`)

#### Option B: Manual Secret Setting

```bash
# Dev environment (default)
pnpm exec wrangler secret put DATABASE_URL
pnpm exec wrangler secret put OPENROUTER_API_KEY
pnpm exec wrangler secret put FIRECRAWL_API_KEY
pnpm exec wrangler secret put INTERNAL_TOKEN

# Prod environment
pnpm exec wrangler secret put DATABASE_URL --env prod
pnpm exec wrangler secret put OPENROUTER_API_KEY --env prod
pnpm exec wrangler secret put FIRECRAWL_API_KEY --env prod
pnpm exec wrangler secret put INTERNAL_TOKEN --env prod
```

**Important:** The `INTERNAL_TOKEN` must match between:

- Worker secret (`INTERNAL_TOKEN`)
- Vercel environment variable (`INTERNAL_TOKEN`) — server-side only, NOT `NEXT_PUBLIC_`

### 3. Verify Secrets

```bash
# List secrets for dev
pnpm exec wrangler secret list

# List secrets for prod
pnpm exec wrangler secret list --env prod
```

## Deployment

### Dev Environment

```bash
pnpm run worker:deploy
```

Deploys to: `agi-canary-etl.workers.dev`

### Production Environment

```bash
pnpm run worker:deploy:prod
```

Deploys to: `agi-canary-etl-prod.workers.dev`

## Configuration

Worker configuration is in `wrangler.jsonc`:

- **Cron Trigger:** Daily at 3 AM UTC (`0 3 * * *`)
- **R2 Buckets:**
  - Dev: `agi-canary-documents-dev`
  - Prod: `agi-canary-documents-prod`
- **Environment Variables:**
  - `BATCH_SIZE`: Jobs per `/run` invocation (default: 15)
  - `TIME_BUDGET_MS`: Time budget per run (default: 20000)
  - `WORKER_URL`: Base Worker URL for self-kick (same as Vercel; Worker builds `/run` from it). Optional; set if using custom domain.
- `RUNNER_URL`: Full URL to `/run` (optional override)

## Vercel Environment Variables

After deploying the Worker, set these in your Vercel project:

| Variable         | Description                                 | Example                              |
| ---------------- | ------------------------------------------- | ------------------------------------ |
| `WORKER_URL`     | Worker URL (dev or prod)                    | `https://agi-canary-etl.workers.dev` |
| `INTERNAL_TOKEN` | Must match Worker's `INTERNAL_TOKEN` secret | (same value as Worker secret)        |

**Security Note:** These are server-side only variables (no `NEXT_PUBLIC_` prefix). The admin UI proxies requests through `/api/admin/worker/kick` to keep the token secure.

## Testing

### Local Development

```bash
pnpm run worker:dev
```

This starts a local development server. You'll need to set up a `.dev.vars` file:

```bash
# .dev.vars (gitignored)
DATABASE_URL=your_neon_connection_string
OPENROUTER_API_KEY=your_openrouter_key
FIRECRAWL_API_KEY=your_firecrawl_key
INTERNAL_TOKEN=your_internal_token
```

### Health Check

```bash
curl https://agi-canary-etl.workers.dev/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### Manual Runner Kick

```bash
curl -X POST https://agi-canary-etl.workers.dev/run \
  -H "Authorization: Bearer YOUR_INTERNAL_TOKEN"
```

## Production Checklist

- [ ] Worker secrets set for prod environment
- [ ] Worker deployed to prod (`pnpm run worker:deploy:prod`)
- [ ] Vercel env vars set (`WORKER_URL`, `INTERNAL_TOKEN`)
- [ ] R2 bucket exists (`agi-canary-documents-prod`)
- [ ] Database migration applied (`pnpm db:migrate`)
- [ ] Health check passes
- [ ] Cron trigger verified (check Cloudflare dashboard)

## Troubleshooting

### Worker Returns 401

- Verify `INTERNAL_TOKEN` matches between Worker secret and Vercel env var
- Check Authorization header format: `Bearer <token>`

### Jobs Not Processing

- Check Worker logs: `pnpm exec wrangler tail --env prod`
- Verify `DATABASE_URL` secret is set correctly
- Check database connection (Neon dashboard)

### R2 Access Errors

- Verify R2 bucket exists: `pnpm exec wrangler r2 bucket list`
- Check bucket name in `wrangler.jsonc` matches actual bucket
- Ensure R2 binding is configured correctly

### TypeScript Errors

- Ensure `@cloudflare/workers-types` is installed: `pnpm add -D @cloudflare/workers-types`
- Workers directory has its own `tsconfig.json` that extends the main config

## Monitoring

View Worker logs:

```bash
# Dev logs
pnpm exec wrangler tail

# Prod logs
pnpm exec wrangler tail --env prod
```

View metrics in Cloudflare Dashboard → Workers & Pages → agi-canary-etl-prod
