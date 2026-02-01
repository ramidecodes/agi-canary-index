/**
 * Run the signal processing pipeline locally (no Worker).
 * Uses DATABASE_URL, OPENROUTER_API_KEY, R2_BUCKET_NAME, and R2 credentials from .env.
 *
 * Usage: pnpm run pipeline:signal:local [-- --document-ids=id1,id2]
 */

import "dotenv/config";
import { createDb } from "../src/lib/db";
import { runSignalProcessing } from "../src/lib/signal/run";

function parseDocumentIds(): string[] | undefined {
  const arg = process.argv.find((a) => a.startsWith("--document-ids="));
  if (!arg) return undefined;
  const value = arg.slice("--document-ids=".length).trim();
  if (!value) return undefined;
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const r2BucketName = process.env.R2_BUCKET_NAME;
  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  if (!openRouterApiKey) {
    console.error("OPENROUTER_API_KEY is required");
    process.exit(1);
  }
  if (!r2BucketName) {
    console.error("R2_BUCKET_NAME is required");
    process.exit(1);
  }
  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    console.error(
      "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are required for fetching documents from R2",
    );
    process.exit(1);
  }

  const documentIds = parseDocumentIds();
  const db = createDb(databaseUrl);

  console.log(
    "Running signal processing locally (documentIds=%s)...",
    documentIds ? documentIds.join(",") : "next batch",
  );

  const stats = await runSignalProcessing(
    { db, r2BucketName, openRouterApiKey },
    { documentIds },
  );

  console.log(JSON.stringify(stats, null, 2));
  console.log(
    "Done. documentsProcessed=%s documentsFailed=%s signalsCreated=%s durationMs=%s",
    stats.documentsProcessed,
    stats.documentsFailed,
    stats.signalsCreated,
    stats.durationMs,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
