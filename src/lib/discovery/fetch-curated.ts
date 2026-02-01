/**
 * Curated page fetcher - extracts article links from HTML.
 * For lab research pages, report indexes, etc.
 * @see docs/features/03-discovery-pipeline.md
 */

import type { DiscoveredItem } from "./types";
import { canonicalizeUrl, urlHash } from "./url";

const FETCH_TIMEOUT_MS = 30_000;
const MAX_LINKS = 100;

/** Path segments that typically indicate article content */
const ARTICLE_PATH_PATTERNS = [
  /\/blog\//i,
  /\/news\//i,
  /\/research\//i,
  /\/article/i,
  /\/post\//i,
  /\/[0-9]{4}\/[0-9]{2}\//i,
  /\/p\/\w+/i,
];

export async function fetchCurated(
  pageUrl: string,
  sourceId: string,
): Promise<{ items: DiscoveredItem[]; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "AGI-Canary-Watcher/1.0 (Discovery Pipeline)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { items: [], error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const baseUrl = new URL(pageUrl);
    const links = extractArticleLinks(html, baseUrl);
    const limited = links.slice(0, MAX_LINKS);

    const items: DiscoveredItem[] = [];
    const seen = new Set<string>();
    for (const { href, text } of limited) {
      const canonical = canonicalizeUrl(href);
      if (!canonical.startsWith("http")) continue;
      if (seen.has(canonical)) continue;
      seen.add(canonical);
      const hash = await urlHash(canonical);
      items.push({
        url: canonical,
        urlHash: hash,
        title: text?.trim() || null,
        publishedAt: null,
        sourceId,
      });
    }

    return { items };
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : "Unknown error";
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      items: [],
      error: isAbort ? "Fetch timed out (30s)" : msg,
    };
  }
}

function extractArticleLinks(
  html: string,
  baseUrl: URL,
): Array<{ href: string; text?: string }> {
  const results: Array<{ href: string; text?: string }> = [];
  const hrefRe = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m = hrefRe.exec(html);
  while (m !== null) {
    const rawHref = m[1];
    const rawText = m[2].replace(/<[^>]+>/g, "").trim();
    try {
      const resolved = new URL(rawHref, baseUrl);
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:")
        continue;
      if (resolved.hostname !== baseUrl.hostname) continue;
      const path = resolved.pathname + resolved.search;
      const looksLikeArticle = ARTICLE_PATH_PATTERNS.some((p) => p.test(path));
      if (!looksLikeArticle && path === "/") continue;
      if (path.length < 5) continue;
      results.push({ href: resolved.href, text: rawText || undefined });
    } catch {
      // Invalid URL, skip
    }
    m = hrefRe.exec(html);
  }
  return results;
}
