# GitHub Actions: Pipeline setup (manual steps)

This guide walks through configuring the ETL pipeline to run on GitHub Actions. The workflow file is already in the repo (`.github/workflows/pipeline.yml`); you only need to add secrets and optionally adjust the schedule.

## 1. Open repository settings

1. Go to your GitHub repository in the browser.
2. Click **Settings** (repo-level, not your user settings).
3. In the left sidebar, under **Security**, click **Secrets and variables** → **Actions**.

## 2. Add repository secrets

Click **New repository secret** and add each of these. Use the same values you use for Vercel (or your Neon/R2/API keys).

| Secret name            | Where to get it / notes                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Neon dashboard → Connection details → pooled connection string                   |
| `OPENROUTER_API_KEY`   | [OpenRouter](https://openrouter.ai/) API key (for discovery + signal extraction) |
| `FIRECRAWL_API_KEY`    | [Firecrawl](https://firecrawl.dev/) API key (for content acquisition)            |
| `R2_ACCOUNT_ID`        | Cloudflare dashboard → R2 → right sidebar "Account ID"                           |
| `R2_ACCESS_KEY_ID`     | Cloudflare R2 → Manage R2 API Tokens → create token with Read & Write            |
| `R2_SECRET_ACCESS_KEY` | Same token as above (secret key)                                                 |
| `R2_BUCKET_NAME`       | Your R2 bucket name (e.g. `agi-canary-documents-prod`)                           |

- **Optional:** `R2_ENDPOINT` — only if you use a custom S3-compatible endpoint; leave unset to use Cloudflare’s default.
- Names are **case-sensitive**; the workflow expects exactly the names in the table.

## 3. Confirm the workflow file

- Path: `.github/workflows/pipeline.yml`
- It should be on the default branch (e.g. `main`) so that:
  - **Scheduled runs** use this file (scheduled workflows run from the default branch).
  - **Manual runs** can be triggered from the Actions tab.

No need to create the file manually if it’s already in the repo.

## 4. Trigger events

- **Scheduled:** The workflow runs daily at **3:00 UTC** (`cron: "0 3 * * *"`). No extra setup.
- **Manual:** Go to **Actions** → select **"Pipeline"** (or "Run ETL pipeline") → **Run workflow** → choose branch → **Run workflow**.

## 5. (Optional) Use an environment

If you want approval gates or separate secrets for production:

1. **Settings** → **Environments** → **New environment** (e.g. `production`).
2. Add the same secrets to that environment (or override only the ones that differ).
3. Edit `.github/workflows/pipeline.yml` and set the job to use that environment:

   ```yaml
   jobs:
     run-pipeline:
       runs-on: ubuntu-latest
       environment: production # add this line
   ```

4. Reference environment secrets in the workflow the same way as repo secrets (e.g. `${{ secrets.DATABASE_URL }}`); GitHub will resolve them from the job’s environment.

## 6. Verify

1. Push a small change or run the workflow manually (Actions → Pipeline → Run workflow).
2. Open the run and check the **Run pipeline** step logs for errors.
3. If the run succeeds, check your Neon DB: you should see new rows in `jobs` and/or `pipeline_runs` after a DISCOVER job runs.

## Troubleshooting

- **"DATABASE_URL is not set"** — The secret name must be exactly `DATABASE_URL`; add it under Settings → Secrets and variables → Actions.
- **R2 / S3 errors** — Confirm `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` match a token with Read & Write on the bucket.
- **Scheduled run didn’t run** — GitHub can delay scheduled workflows under load; ensure the workflow file is on the default branch and that Actions are enabled for the repo.
- **Workflow not listed** — Push `.github/workflows/pipeline.yml` to the default branch and refresh the Actions tab.

For architecture and env vars overview, see [INFRASTRUCTURE.md](INFRASTRUCTURE.md). For the pipeline design, see [features/20-pipeline-github-actions.md](features/20-pipeline-github-actions.md).
