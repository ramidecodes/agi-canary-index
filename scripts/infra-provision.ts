#!/usr/bin/env npx tsx
/**
 * Provision Cloudflare pipeline resources (R2 bucket).
 * Run: pnpm run infra:provision -- --env=dev|staging|prod (or ENV=dev pnpm run infra:provision)
 * Idempotent: checks wrangler r2 bucket list first; skips create if bucket exists.
 * @see docs/features/14-cloudflare-infra-management.md
 */

import { execSync } from "node:child_process";

const env =
  process.argv.find((a) => a.startsWith("--env="))?.split("=")[1] ??
  process.env.ENV ??
  "dev";

const bucketName = `agi-canary-documents-${env}`;

function bucketExists(name: string): boolean {
  try {
    const out = execSync("pnpm exec wrangler r2 bucket list", {
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"],
    });
    return out.includes(name);
  } catch {
    return false;
  }
}

console.log(`Provisioning R2 bucket: ${bucketName}`);

if (bucketExists(bucketName)) {
  console.log(`R2 bucket ${bucketName} already exists (idempotent)`);
  process.exit(0);
}

try {
  execSync(`pnpm exec wrangler r2 bucket create ${bucketName}`, {
    stdio: "inherit",
  });
  console.log(`Created R2 bucket: ${bucketName}`);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("already exists") || msg.includes("BucketAlreadyExists")) {
    console.log(`R2 bucket ${bucketName} already exists (idempotent)`);
  } else {
    throw err;
  }
}
