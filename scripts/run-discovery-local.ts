/**
 * Run the discovery pipeline locally (no Worker).
 * Uses DATABASE_URL and OPENROUTER_API_KEY from .env.
 * Use forceNewRun so we do not skip due to "another run in progress".
 *
 * Usage: pnpm run pipeline:discover:local [--dry-run]
 */

import "dotenv/config";
import { createDb } from "../src/lib/db";
import { runDiscovery } from "../src/lib/discovery/run";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  if (!openRouterApiKey) {
    console.error("OPENROUTER_API_KEY is required for search sources");
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");
  const db = createDb(databaseUrl);

  console.log(
    "Running discovery locally (forceNewRun=true, dryRun=%s)...",
    dryRun,
  );

  const stats = await runDiscovery({
    db,
    options: {
      openRouterApiKey,
      dryRun,
      forceNewRun: true, // supersede any running run so we don't skip
      runId: undefined,
    },
  });

  console.log(JSON.stringify(stats, null, 2));
  console.log(
    "Done. itemsDiscovered=%s itemsInserted=%s sourcesSucceeded=%s sourcesFailed=%s durationMs=%s",
    stats.itemsDiscovered,
    stats.itemsInserted,
    stats.sourcesSucceeded,
    stats.sourcesFailed,
    stats.durationMs,
  );
  if (stats.skipped) {
    console.warn("Skipped: %s", stats.skipReason);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
