/**
 * RSS/Atom feed fetcher for discovery pipeline.
 * Handles RSS 2.0 and Atom 1.0 formats.
 * @see docs/features/03-discovery-pipeline.md
 */

import Parser from "rss-parser";
import type { DiscoveredItem } from "./types";
import { canonicalizeUrl, urlHash } from "./url";

const FETCH_TIMEOUT_MS = 30_000;
const MAX_ITEMS = 500;

/** Fix common RSS/XML issues before parsing. */
function sanitizeRssXml(xml: string): string {
  let out = xml;
  // Unescaped ampersands in attributes
  out = out.replace(
    /&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g,
    "&amp;",
  );
  // Attributes without value (e.g. "<tag attr>" or "<tag attr />") break parsers
  out = out.replace(
    /\s+([a-zA-Z:_][a-zA-Z0-9._:-]*)\s*(?!=)([/>])/g,
    (_, name, bracket) => ` ${name}=""${bracket}`,
  );
  return out;
}

export async function fetchRss(
  feedUrl: string,
  sourceId: string,
): Promise<{ items: DiscoveredItem[]; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "AGI-Canary-Watcher/1.0 (Discovery Pipeline)",
        Accept: "application/rss+xml, application/xml, application/atom+xml",
      },
    });
    clearTimeout(timeoutId);

    if (res.status === 304) {
      return { items: [] };
    }
    if (!res.ok) {
      return { items: [], error: `HTTP ${res.status}` };
    }

    const text = await res.text();
    const parser = new Parser({
      customFields: {
        item: [
          ["dc:date", "dcDate"],
          ["dc:creator", "dcCreator"],
          ["content:encoded", "contentEncoded"],
        ],
      },
    });

    let feed: {
      items?: Array<{
        link?: string;
        guid?: string;
        title?: string;
        pubDate?: string;
        isoDate?: string;
        dcDate?: string;
      }>;
    };
    try {
      feed = (await parser.parseString(sanitizeRssXml(text))) as typeof feed;
    } catch (parseErr) {
      const msg =
        parseErr instanceof Error ? parseErr.message : "XML parse failed";
      return {
        items: [],
        error:
          msg.includes("entity") || msg.includes("Entity")
            ? "Malformed RSS/XML (invalid entities or attributes)"
            : msg,
      };
    }
    const rawItems = feed.items ?? [];
    const sorted = [...rawItems].sort((a, b) => {
      const aDate = parseDate(a.pubDate ?? a.isoDate ?? a.dcDate);
      const bDate = parseDate(b.pubDate ?? b.isoDate ?? b.dcDate);
      return bDate - aDate;
    });
    const limited = sorted.slice(0, MAX_ITEMS);

    const items: DiscoveredItem[] = [];
    for (const entry of limited) {
      const link = entry.link ?? entry.guid;
      if (!link || typeof link !== "string") continue;
      const canonical = canonicalizeUrl(link);
      if (!canonical.startsWith("http")) continue;
      const hash = await urlHash(canonical);
      const pubDate = parseDate(entry.pubDate ?? entry.isoDate ?? entry.dcDate);
      items.push({
        url: canonical,
        urlHash: hash,
        title: entry.title?.trim() ?? null,
        publishedAt: Number.isNaN(pubDate) ? null : new Date(pubDate),
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

function parseDate(val: string | undefined): number {
  if (!val) return Number.NaN;
  const d = new Date(val);
  return d.getTime();
}
