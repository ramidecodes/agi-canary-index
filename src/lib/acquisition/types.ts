/**
 * Types for content acquisition pipeline.
 * @see docs/features/04-acquisition-pipeline.md
 */

export interface FirecrawlScrapeResult {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
      language?: string;
      /** Open Graph / article metadata */
      "og:title"?: string;
      "article:published_time"?: string;
      "og:site_name"?: string;
      [key: string]: unknown;
    };
  };
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
    statusCode?: number;
    error?: string;
    [key: string]: unknown;
  };
  warning?: string;
}

export interface ExtractedMetadata {
  title?: string;
  description?: string;
  author?: string;
  publishedTime?: string;
  siteName?: string;
  contentType?: "article" | "paper" | "blog" | "report" | "other";
  language?: string;
  sourceURL?: string;
  [key: string]: unknown;
}

export interface AcquireItemResult {
  itemId: string;
  success: boolean;
  documentId?: string;
  error?: string;
}

export interface AcquisitionRunStats {
  itemsProcessed: number;
  itemsAcquired: number;
  itemsFailed: number;
  durationMs: number;
  perItem: AcquireItemResult[];
}
