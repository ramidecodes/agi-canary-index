/**
 * Run the acquisition pipeline locally (no Worker).
 * Uses DATABASE_URL, FIRECRAWL_API_KEY, and R2 credentials from .env.
 *
 * Usage: pnpm run pipeline:acquire:local [-- --item-ids=id1,id2]
 */

import "dotenv/config";
import { createDb } from "../src/lib/db";
import { createR2Bucket } from "../src/lib/r2";
import { runAcquisition } from "../src/lib/acquisition/run";

function parseItemIds(): string[] | undefined {
  const arg = process.argv.find((a) => a.startsWith("--item-ids="));
  if (!arg) return undefined;
  const value = arg.slice("--item-ids=".length).trim();
  if (!value) return undefined;
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2BucketName = process.env.R2_BUCKET_NAME;

  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  if (!firecrawlApiKey) {
    console.error("FIRECRAWL_API_KEY is required");
    process.exit(1);
  }
  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
    console.error(
      "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME are required",
    );
    process.exit(1);
  }

  const itemIds = parseItemIds();
  const db = createDb(databaseUrl);
  const r2Bucket = createR2Bucket();

  console.log(
    "Running acquisition locally (itemIds=%s)...",
    itemIds ? itemIds.join(",") : "next batch",
  );

  const stats = await runAcquisition(
    { db, firecrawlApiKey, r2Bucket },
    { itemIds },
  );

  console.log(JSON.stringify(stats, null, 2));
  console.log(
    "Done. itemsProcessed=%s itemsAcquired=%s itemsFailed=%s durationMs=%s",
    stats.itemsProcessed,
    stats.itemsAcquired,
    stats.itemsFailed,
    stats.durationMs,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
