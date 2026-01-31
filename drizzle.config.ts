/**
 * Drizzle Kit configuration for migrations and schema introspection.
 * Uses DATABASE_URL from .env (Neon pooled connection string).
 */

import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required for Drizzle config");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});
