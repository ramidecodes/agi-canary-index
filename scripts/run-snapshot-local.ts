/**
 * Run the daily snapshot aggregation locally (no Worker).
 * Uses DATABASE_URL from .env.
 *
 * Usage: pnpm run pipeline:snapshot:local [-- --date=YYYY-MM-DD]
 */

import "dotenv/config";
import { createDb } from "../src/lib/db";
import { createDailySnapshot } from "../src/lib/signal/snapshot";

function parseDate(): string {
  const arg = process.argv.find((a) => a.startsWith("--date="));
  if (!arg) {
    return new Date().toISOString().slice(0, 10);
  }
  const value = arg.slice("--date=".length).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    console.error("Invalid date format. Use YYYY-MM-DD");
    process.exit(1);
  }
  return value;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const dateStr = parseDate();
  const db = createDb(databaseUrl);

  console.log("Running daily snapshot (date=%s)...", dateStr);

  const result = await createDailySnapshot(db, dateStr);

  console.log(
    "Done. signalCount=%s created=%s",
    result.signalCount,
    result.created,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
