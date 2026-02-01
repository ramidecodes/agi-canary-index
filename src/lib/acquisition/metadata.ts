/**
 * Metadata extraction from Firecrawl response.
 * Maps Open Graph, article tags, and other metadata.
 */

import type { ExtractedMetadata } from "./types";
import type { FirecrawlScrapeResult } from "./types";

function detectContentType(
  metadata: Record<string, unknown>,
  url: string,
): ExtractedMetadata["contentType"] {
  const title = String(
    metadata.title ?? metadata["og:title"] ?? "",
  ).toLowerCase();
  const desc = String(metadata.description ?? "").toLowerCase();
  const combined = `${title} ${desc}`;

  if (
    combined.includes("arxiv") ||
    combined.includes("paper") ||
    url.includes("/pdf") ||
    url.includes("arxiv.org")
  ) {
    return "paper";
  }
  if (
    combined.includes("report") ||
    combined.includes("whitepaper") ||
    combined.includes("analysis")
  ) {
    return "report";
  }
  if (
    combined.includes("blog") ||
    url.includes("/blog") ||
    url.includes("medium.com") ||
    url.includes("substack.com")
  ) {
    return "blog";
  }
  return "article";
}

/**
 * Extract structured metadata from Firecrawl scrape result.
 */
export function extractMetadata(
  result: FirecrawlScrapeResult,
  url: string,
): ExtractedMetadata {
  const meta = result.data?.metadata ?? result.metadata ?? {};
  const m = meta as Record<string, unknown>;

  return {
    title: (m.title ?? m["og:title"]) as string | undefined,
    description: (m.description ?? m["og:description"]) as string | undefined,
    author: (m.author ?? m["article:author"] ?? m.byline) as string | undefined,
    publishedTime: (m["article:published_time"] ?? m.datePublished) as
      | string
      | undefined,
    siteName: (m["og:site_name"] ?? m.siteName) as string | undefined,
    language: (m.language ?? m["og:locale"]) as string | undefined,
    sourceURL: (m.sourceURL ?? url) as string | undefined,
    contentType: detectContentType(m, url),
  };
}
