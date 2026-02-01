#!/usr/bin/env npx tsx
/**
 * Teardown Cloudflare pipeline resources.
 * Run: pnpm run infra:teardown [--env dev|staging|prod]
 * Prompts for confirmation before destructive actions.
 * @see docs/features/14-cloudflare-infra-management.md
 */

import { execSync } from "node:child_process";
import * as readline from "node:readline";

const env =
  process.argv.find((a) => a.startsWith("--env="))?.split("=")[1] ??
  process.env.ENV ??
  "dev";

const bucketName = `agi-canary-documents-${env}`;
async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  console.log(`Teardown for env: ${env}`);
  console.log(`This will delete R2 bucket: ${bucketName}`);
  console.log(
    "Workers will be deleted on next deploy (or manually via dashboard).",
  );
  const confirm = await prompt("Continue? (y/N): ");
  if (confirm !== "y" && confirm !== "yes") {
    console.log("Aborted.");
    return;
  }

  try {
    execSync(`pnpm exec wrangler r2 bucket delete ${bucketName}`, {
      stdio: "inherit",
    });
    console.log(`Deleted R2 bucket: ${bucketName}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("No such bucket") || msg.includes("not found")) {
      console.log(`Bucket ${bucketName} does not exist.`);
    } else {
      throw err;
    }
  }

  console.log(
    "Teardown complete. Secrets and Workers are not automatically removed.",
  );
}

main().catch(console.error);
