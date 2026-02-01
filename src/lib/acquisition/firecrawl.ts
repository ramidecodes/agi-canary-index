/**
 * Firecrawl scrape API client.
 * Fetches page content as markdown with metadata.
 * @see https://docs.firecrawl.dev/api-reference/endpoint/scrape
 */

import type { FirecrawlScrapeResult } from "./types";

const FIRECRAWL_API = "https://api.firecrawl.dev/v2/scrape";

const DEFAULT_TIMEOUT_MS = 60_000;

export interface ScrapeOptions {
  url: string;
  apiKey: string;
  timeoutMs?: number;
}

/**
 * Scrape a single URL via Firecrawl API.
 * Returns markdown content and metadata.
 */
export async function scrapeUrl(
  options: ScrapeOptions,
): Promise<FirecrawlScrapeResult> {
  const { url, apiKey, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(FIRECRAWL_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: Math.min(timeoutMs, 60_000),
      }),
      signal: controller.signal,
    });

    const json = (await res.json()) as FirecrawlScrapeResult;

    if (!res.ok) {
      const errMsg =
        json.metadata?.error ?? json.warning ?? `HTTP ${res.status}`;
      return {
        success: false,
        metadata: { ...json.metadata, error: errMsg },
      };
    }

    return json;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Scrape failed";
    return {
      success: false,
      metadata: { error: msg },
    };
  } finally {
    clearTimeout(timeout);
  }
}
