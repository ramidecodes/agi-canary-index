/**
 * X (Twitter) search discovery via Grok (OpenRouter).
 * Feature-flagged; can be disabled for regulatory compliance.
 * @see docs/features/03-discovery-pipeline.md
 */

import { X_SEARCH_MODEL } from "../ai-models";
import type { DiscoveredItem } from "./types";
import { canonicalizeUrl, urlHash } from "./url";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";
const FETCH_TIMEOUT_MS = 45_000;

const X_SEARCH_QUERY =
  "Find recent posts from X (Twitter) about AI announcements, agent projects, local/autonomous agents, new benchmarks, model releases, and AI community trends. Include links to articles, blog posts, papers, or project pages shared in the posts. Pay attention to agent communities and tools (e.g., Moltbook, clawdbot) if mentioned. Return URLs with titles/snippets and author info.";

export async function fetchX(
  sourceId: string,
  apiKey: string,
  _queryConfig?: Record<string, unknown>,
): Promise<{ items: DiscoveredItem[]; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(OPENROUTER_BASE, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://agi-canary-watcher.dev",
      },
      body: JSON.stringify({
        model: X_SEARCH_MODEL,
        messages: [{ role: "user", content: X_SEARCH_QUERY }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "x_results",
            strict: true,
            schema: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      url: {
                        type: "string",
                        description: "Article URL shared in post",
                      },
                      title: {
                        type: "string",
                        description: "Title or snippet",
                      },
                      author: { type: "string", description: "X handle" },
                    },
                    required: ["url", "title"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["results"],
              additionalProperties: false,
            },
          },
        },
        max_tokens: 4096,
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text();
      return {
        items: [],
        error: `OpenRouter ${res.status}: ${body.slice(0, 200)}`,
      };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (json.error) {
      return { items: [], error: json.error.message ?? "OpenRouter error" };
    }

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return { items: [], error: "Empty response from Grok" };
    }

    let parsed: { results?: Array<{ url: string; title: string }> };
    try {
      parsed = JSON.parse(content) as typeof parsed;
    } catch {
      return { items: [], error: "Invalid JSON in Grok response" };
    }

    const results = parsed.results ?? [];
    const items: DiscoveredItem[] = [];
    for (const r of results) {
      if (!r.url || typeof r.url !== "string") continue;
      if (r.url.includes("twitter.com") || r.url.includes("x.com")) continue;
      const canonical = canonicalizeUrl(r.url);
      if (!canonical.startsWith("http")) continue;
      const hash = await urlHash(canonical);
      items.push({
        url: canonical,
        urlHash: hash,
        title: r.title?.trim() ?? null,
        publishedAt: null,
        sourceId,
      });
    }

    return { items };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      items: [],
      error: isAbort ? "Request timed out (45s)" : msg,
    };
  }
}
