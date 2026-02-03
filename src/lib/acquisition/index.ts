/**
 * Content acquisition pipeline.
 * Fetches content via direct HTTP + HTML parsing (RSS-only), stores in R2, creates document records.
 * @see docs/features/04-acquisition-pipeline.md
 */

export { runAcquisition } from "./run";
export type { AcquisitionOptions, R2Bucket } from "./run";
export type {
  AcquisitionRunStats,
  ExtractedMetadata,
  FirecrawlScrapeResult,
  AcquireItemResult,
} from "./types";
export { fetchArticleContent } from "./rss-content";
export { validateContent } from "./validate";
export { extractMetadata, extractMetadataFromUrl } from "./metadata";
