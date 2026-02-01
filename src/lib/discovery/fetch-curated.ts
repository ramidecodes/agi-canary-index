/**
 * Curated page fetcher - extracts article links from HTML.
 * For lab research pages, report indexes, etc.
 * Uses node-html-parser for fast, reliable DOM-based parsing.
 * @see docs/features/03-discovery-pipeline.md
 */

import { parse } from "node-html-parser";
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

function extractArticleLinks(
  html: string,
  baseUrl: URL
): Array<{ href: string; text?: string }> {
  const root = parse(html, {
    lowerCaseTagName: true,
    blockTextElements: { script: true, style: true },
  });
  const results: Array<{ href: string; text?: string }> = [];
  const seen = new Set<string>();

  for (const el of root.querySelectorAll("a[href]")) {
    const rawHref = el.getAttribute("href");
    if (!rawHref) continue;
    try {
      const resolved = new URL(rawHref, baseUrl);
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:")
        continue;
      if (resolved.hostname !== baseUrl.hostname) continue;
      const path = resolved.pathname + resolved.search;
      const looksLikeArticle = ARTICLE_PATH_PATTERNS.some((p) => p.test(path));
      if (!looksLikeArticle && path === "/") continue;
      if (path.length < 5) continue;
      const href = resolved.href;
      if (seen.has(href)) continue;
      seen.add(href);
      const text = el.text?.trim() || undefined;
      results.push({ href, text });
    } catch {
      // Invalid URL, skip
    }
  }
  return results;
}

export async function fetchCurated(
  pageUrl: string,
  sourceId: string
): Promise<{ items: DiscoveredItem[]; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AGI-Canary-Watcher/1.0; +https://github.com/agi-canary)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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
    let iter = 0;
    for (const { href, text } of limited) {
      if (iter > 0 && iter % 25 === 0) {
        await new Promise((r) => setImmediate(r)); // Yield every 25 items to keep app responsive
      }
      iter++;
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
