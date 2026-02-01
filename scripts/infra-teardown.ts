#!/usr/bin/env npx tsx
/**
 * Teardown Cloudflare pipeline resources (R2 bucket and Worker for env).
 * Run: pnpm run infra:teardown -- --env=dev|staging|prod (or ENV=dev pnpm run infra:teardown)
 * Prompts for confirmation before destructive actions.
 * Does not touch Neon database or secrets.
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

function run(
  cmd: string,
  args: string[] = [],
): { ok: boolean; stderr?: string } {
  try {
    execSync([cmd, ...args].join(" "), {
      stdio: "inherit",
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, stderr: msg };
  }
}

async function main() {
  console.log(`Teardown for env: ${env}`);
  console.log(
    `This will remove R2 bucket: ${bucketName} and the pipeline Worker for this env.`,
  );
  console.log("Neon database and wrangler secrets are not modified.");
  const confirm = await prompt(
    `Remove R2 bucket and Worker for ${env}? (y/N): `,
  );
  if (confirm !== "y" && confirm !== "yes") {
    console.log("Aborted.");
    return;
  }

  // Delete Worker for this env (wrangler delete --env <env>)
  console.log(`Removing Worker (env: ${env})...`);
  const workerResult = run("pnpm exec wrangler delete", ["--env", env]);
  if (workerResult.ok) {
    console.log(`Worker for ${env} removed.`);
  } else if (
    workerResult.stderr?.includes("not found") ||
    workerResult.stderr?.includes("Unknown")
  ) {
    console.log(`Worker for ${env} does not exist (skipped).`);
  } else {
    console.warn(
      `Worker deletion reported an error (may already be gone):`,
      workerResult.stderr,
    );
  }

  // Delete R2 bucket
  console.log(`Removing R2 bucket: ${bucketName}...`);
  const bucketResult = run(`pnpm exec wrangler r2 bucket delete ${bucketName}`);
  if (bucketResult.ok) {
    console.log(`Deleted R2 bucket: ${bucketName}`);
  } else if (
    bucketResult.stderr?.includes("No such bucket") ||
    bucketResult.stderr?.includes("not found")
  ) {
    console.log(`Bucket ${bucketName} does not exist.`);
  } else {
    throw new Error(`Failed to delete bucket: ${bucketResult.stderr}`);
  }

  console.log(
    "Teardown complete. Secrets and Neon database were not modified.",
  );
}

main().catch(console.error);
