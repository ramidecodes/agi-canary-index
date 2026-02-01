#!/usr/bin/env npx tsx
/**
 * Interactive secret setup for Cloudflare Workers.
 * Run: pnpm run infra:secrets [--env dev|staging|prod]
 * Prompts for DATABASE_URL, OPENROUTER_API_KEY, FIRECRAWL_API_KEY
 * @see docs/features/14-cloudflare-infra-management.md
 */

import { spawnSync } from "node:child_process";
import * as readline from "node:readline";

const env =
  process.argv.find((a) => a.startsWith("--env="))?.split("=")[1] ??
  process.env.ENV ??
  "dev";

const envFlag = env === "dev" ? [] : ["--env", env];

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function putSecret(name: string, value: string): Promise<void> {
  if (!value) {
    console.log(`Skipping ${name} (empty)`);
    return;
  }
  try {
    const result = spawnSync(
      "pnpm",
      ["exec", "wrangler", "secret", "put", name, ...envFlag],
      { input: value, stdio: ["pipe", "inherit", "inherit"] },
    );
    if (result.status === 0) {
      console.log(`Set ${name}`);
    } else {
      console.error(`Failed to set ${name}`);
    }
  } catch (err) {
    console.error(`Failed to set ${name}:`, err);
  }
}

async function main() {
  console.log(`Setting secrets for env: ${env}`);
  console.log("");

  const databaseUrl = await prompt(
    "DATABASE_URL (Neon pooled connection string): ",
  );
  const openRouterKey = await prompt("OPENROUTER_API_KEY: ");
  const firecrawlKey = await prompt(
    "FIRECRAWL_API_KEY (optional, for acquisition): ",
  );

  await putSecret("DATABASE_URL", databaseUrl);
  await putSecret("OPENROUTER_API_KEY", openRouterKey);
  await putSecret("FIRECRAWL_API_KEY", firecrawlKey);

  console.log("");
  console.log("Secrets configured.");
}

main().catch(console.error);
