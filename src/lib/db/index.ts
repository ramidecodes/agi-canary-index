/**
 * Database client and schema exports.
 * Use Neon serverless driver for Vercel and Cloudflare Workers.
 * @see docs/features/01-database-schema.md
 * @see docs/INFRASTRUCTURE.md
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import * as relations from "./relations";

/**
 * Create a Drizzle client for Neon Postgres.
 * Pass DATABASE_URL (Neon pooled connection string).
 * In Workers: use env.DATABASE_URL from the request context.
 */
export function createDb(connectionString: string) {
  const sql = neon(connectionString);
  return drizzle({ client: sql, schema: { ...schema, ...relations } });
}

/**
 * Get db instance using process.env.DATABASE_URL.
 * Use in Next.js API routes and server code. Throws if DATABASE_URL is missing.
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return createDb(url);
}

// Re-export schema and types for consumers
export * from "./schema";
export * from "./relations";
export * from "./validators";
