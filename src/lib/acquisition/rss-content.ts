/**
 * Fetch article content from a URL using direct HTTP + HTML parsing.
 * Replaces Firecrawl for RSS-only pipeline.
 * @see docs/features/04-acquisition-pipeline.md
 */

import { parse } from "node-html-parser";

const ARTICLE_SELECTORS = [
  "article",
  ".post-content",
  ".entry-content",
  ".article-content",
  "main article",
  "[itemprop='articleBody']",
  "main",
];

const DEFAULT_TIMEOUT_MS = 30_000;
const MIN_WORD_COUNT_SUCCESS = 100;

export interface FetchArticleResult {
  content: string;
  wordCount: number;
  success: boolean;
}

/**
 * Fetch a URL and extract main article text using common HTML selectors.
 */
export async function fetchArticleContent(
  url: string,
  options?: { timeoutMs?: number },
): Promise<FetchArticleResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AGI-Canary-Bot/1.0" },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      return { content: "", wordCount: 0, success: false };
    }

    const html = await res.text();
    const root = parse(html);

    let article: ReturnType<typeof root.querySelector> = null;
    for (const selector of ARTICLE_SELECTORS) {
      article = root.querySelector(selector);
      if (article) break;
    }

    const content = article?.textContent?.trim() ?? "";
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    return {
      content,
      wordCount,
      success: wordCount >= MIN_WORD_COUNT_SUCCESS,
    };
  } catch {
    return { content: "", wordCount: 0, success: false };
  }
}
