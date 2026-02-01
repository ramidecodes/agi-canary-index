#!/usr/bin/env npx tsx
/**
 * Provision Cloudflare pipeline resources (R2 bucket).
 * Run: pnpm run infra:provision [--env dev|staging|prod]
 * @see docs/features/14-cloudflare-infra-management.md
 */

import { execSync } from "node:child_process";

const env =
  process.argv.find((a) => a.startsWith("--env="))?.split("=")[1] ??
  process.env.ENV ??
  "dev";

const bucketName = `agi-canary-documents-${env}`;

console.log(`Provisioning R2 bucket: ${bucketName}`);

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
