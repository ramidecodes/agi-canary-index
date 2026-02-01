/**
 * Web search discovery via Perplexity Sonar (OpenRouter).
 * Extracts URLs from search results with citations.
 * @see docs/features/03-discovery-pipeline.md
 */

import { generateObject } from "ai";
import { z } from "zod";
import { WEB_SEARCH_MODEL } from "../ai-models";
import type { DiscoveredItem } from "./types";
import { canonicalizeUrl, urlHash } from "./url";
import { getOpenRouterModel } from "./openrouter";

const RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const SEARCH_TIMEOUT_MS = 55_000; // Under 60s to allow outer race timeout to work

const SEARCH_KEYWORDS = [
  "AI news",
  "AI research",
  "AI policy",
  "AI benchmark",
  "AI capability",
  "frontier model",
  "open-source model release",
  "agentic workflows",
  "AI agents",
  "autonomous agents",
  "local agents",
  "multi-agent systems",
  "tool use",
  "MCP protocol",
  "agent frameworks",
  "agent marketplaces",
  "AI safety",
  "AGI evaluation",
  "ARC-AGI",
  "METR evaluation",
  "OECD AI",
  "Moltbook",
  "clawdbot",
];

const SearchResultSchema = z.object({
  results: z.array(
    z.object({
      url: z.string().url(),
      title: z.string(),
      snippet: z.string().optional(),
      domain: z.string().optional(),
      category: z
        .enum([
          "capability",
          "agent_autonomy",
          "infrastructure",
          "policy",
          "community",
          "research",
          "product",
          "other",
        ])
        .optional(),
      rationale: z.string().optional(),
    }),
  ),
});

export async function fetchSearch(
  sourceId: string,
  apiKey: string,
  queryConfig?: Record<string, unknown>,
): Promise<{ items: DiscoveredItem[]; error?: string }> {
  const keywords = (queryConfig?.keywords as string[]) ?? SEARCH_KEYWORDS;
  const query = `Find recent (last 7 days) AI-related news, research updates, policy announcements, and agent project releases. 
Focus on: ${keywords.slice(0, 10).join(", ")}.
Include meaningful announcements (new models, benchmarks, tooling, agent autonomy, multi-agent systems, local agents, or novel agent communities).
Example: trends around more autonomous local agents and agent-focused communities (like Moltbook or projects such as clawdbot).
Return only URLs with titles and brief snippets. Add a category and a short rationale for why it matters.`;

  let lastError: string | undefined;

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    await new Promise((r) => setImmediate(r)); // Yield before AI call so event loop can serve other requests
    try {
      const result = await generateObject({
        model: getOpenRouterModel(apiKey, WEB_SEARCH_MODEL),
        schema: SearchResultSchema,
        prompt: query,
        abortSignal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      });

      const results = result.object.results ?? [];
      const items: DiscoveredItem[] = [];
      for (const r of results) {
        if (!r.url || typeof r.url !== "string") continue;
        const canonical = canonicalizeUrl(r.url);
        if (!canonical.startsWith("http")) continue;
        const hash = await urlHash(canonical);
        const taggedSnippet = r.category
          ? `${r.category}: ${r.snippet ?? ""}`.trim()
          : (r.snippet ?? undefined);
        items.push({
          url: canonical,
          urlHash: hash,
          title: r.title?.trim() ?? null,
          publishedAt: null,
          sourceId,
          snippet: taggedSnippet || undefined,
        });
      }

      return { items };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  return { items: [], error: lastError };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
