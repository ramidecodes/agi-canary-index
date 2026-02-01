/**
 * Interactive script to set Cloudflare Worker secrets via wrangler.
 * Usage: pnpm run infra:secrets [env]
 * Env: dev (default) or prod
 */

import { execSync } from "node:child_process";
import * as readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setSecret(
  name: string,
  env: string,
  description: string,
): Promise<void> {
  const value = await question(
    `Enter ${description} (or press Enter to skip): `,
  );
  if (!value.trim()) {
    console.log(`Skipping ${name}`);
    return;
  }

  const envFlag = env === "prod" ? "--env prod" : "";
  try {
    execSync(`pnpm wrangler secret put ${name} ${envFlag}`, {
      input: value,
      stdio: ["pipe", "inherit", "inherit"],
    });
    console.log(`✓ Set ${name}`);
  } catch (err) {
    console.error(`✗ Failed to set ${name}:`, err);
  }
}

async function main() {
  const envArg = process.argv[2] || "dev";
  const env = envArg === "prod" ? "prod" : "dev";

  console.log(`Setting secrets for environment: ${env}`);
  console.log("");

  await setSecret(
    "DATABASE_URL",
    env,
    "Neon Postgres pooled connection string",
  );
  await setSecret(
    "OPENROUTER_API_KEY",
    env,
    "OpenRouter API key (for AI calls)",
  );
  await setSecret(
    "FIRECRAWL_API_KEY",
    env,
    "Firecrawl API key (for content scraping)",
  );
  await setSecret(
    "INTERNAL_TOKEN",
    env,
    "Internal auth token for /run and /jobs endpoints",
  );
  await setSecret(
    "WORKER_URL",
    env,
    "Worker base URL for self-kick (e.g. https://agi-canary-etl-prod.ramidecodes.workers.dev); optional, same as Vercel WORKER_URL",
  );

  console.log("");
  console.log("Done! Secrets are set.");
  console.log(
    `To verify: pnpm wrangler secret list ${env === "prod" ? "--env prod" : ""}`,
  );

  rl.close();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
