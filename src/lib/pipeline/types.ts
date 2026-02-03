import type { R2Bucket } from "@/lib/r2";

/**
 * Environment passed to pipeline stage processors.
 * Used by the GHA runner (Node) with DOCUMENTS from createR2Bucket();
 * previously used by Cloudflare Worker with DOCUMENTS binding.
 */
export interface PipelineEnv {
  DATABASE_URL: string;
  OPENROUTER_API_KEY: string;
  FIRECRAWL_API_KEY: string;
  DOCUMENTS: R2Bucket;
  BATCH_SIZE: string;
  TIME_BUDGET_MS: string;
}
