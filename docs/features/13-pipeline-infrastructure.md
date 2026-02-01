# Pipeline Infrastructure

**Implemented:** Pipeline runs on Vercel (Next.js API + Vercel Cron); R2 for document storage (S3 API); Neon via `@neondatabase/serverless`; scripts: `infra:provision`, `infra:teardown`. See [docs/INFRASTRUCTURE.md](../INFRASTRUCTURE.md).

## Goal

Define the infrastructure required for the AGI Canary data pipeline. The pipeline (Discovery, Acquisition) runs on Vercel. R2 (Cloudflare) stores document blobs. The app and pipeline share Vercel deployment.

## User Story

As a developer deploying the AGI Canary pipeline, I want a well-defined setup so that Discovery and Acquisition can connect to Neon and R2 and run on schedule.

## Functional Requirements

1. **Deployment Architecture**

   - Next.js on Vercel for app and pipeline
   - Vercel Cron for daily pipeline run (6 AM UTC)
   - R2 for document storage (S3-compatible API)

2. **vercel.json Configuration**

   - Cron: `{ "path": "/api/pipeline/cron", "schedule": "0 6 * * *" }`
   - `CRON_SECRET` env var for auth

3. **Neon Database**

   - Use `DATABASE_URL` in Vercel env
   - `@neondatabase/serverless` with `drizzle-orm/neon-http`

4. **R2 Storage**

   - S3-compatible API with `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
   - Create bucket via `pnpm run infra:provision`

5. **Environment Variables (Vercel)**

   - `DATABASE_URL`, `OPENROUTER_API_KEY`, `FIRECRAWL_API_KEY`
   - `R2_*` for R2 access
   - `CRON_SECRET` for cron auth

## Data Requirements

**No new database tables.** This FRED defines infrastructure configuration.

## User Flow

1. Developer runs `pnpm run infra:provision -- --env=prod` to create R2 bucket
2. Developer sets env vars in Vercel project settings
3. Deploy to Vercel — cron activates automatically
4. Pipeline runs daily at 6 AM UTC

## Acceptance Criteria

- [x] vercel.json has cron schedule
- [x] DATABASE_URL set and pipeline connects to Neon
- [x] R2 bucket provisioned; app uses S3 API for read/write
- [x] Cron trigger fires at scheduled time
- [x] CRON_SECRET protects cron endpoint

## Local pipeline scripts

You can run each pipeline stage locally (no Cloudflare Worker) for debugging. Load env from `.env` (e.g. via `dotenv` when using `tsx`).

| Script      | Command                            | Required env                                                                                                       | Optional CLI                |
| ----------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| Discovery   | `pnpm run pipeline:discover:local` | `DATABASE_URL`, `OPENROUTER_API_KEY`                                                                               | `--dry-run`                 |
| Acquisition | `pnpm run pipeline:acquire:local`  | `DATABASE_URL`, `FIRECRAWL_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | `-- --item-ids=id1,id2`     |
| Signal      | `pnpm run pipeline:signal:local`   | `DATABASE_URL`, `OPENROUTER_API_KEY`, `R2_BUCKET_NAME`, R2 credentials (same as above)                             | `-- --document-ids=id1,id2` |

Examples:

- `pnpm run pipeline:discover:local --dry-run`
- `pnpm run pipeline:acquire:local -- --item-ids=abc123`
- `pnpm run pipeline:signal:local -- --document-ids=doc1,doc2`

## References

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Neon + Vercel](https://neon.tech/docs/guides/vercel)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
