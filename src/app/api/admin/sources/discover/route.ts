/**
 * POST /api/admin/sources/discover
 * Uses Perplexity search to discover new AI research sources (blogs, RSS feeds).
 * Returns candidate sources for admin approval.
 * @see docs/features/02-source-registry.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sources } from "@/lib/db/schema";
import { getOpenRouterModel } from "@/lib/discovery/openrouter";
import { WEB_SEARCH_MODEL } from "@/lib/ai-models";

export const dynamic = "force-dynamic";

const DISCOVER_TIMEOUT_MS = 30_000;

const DiscoveredSourceSchema = z.object({
  sources: z.array(
    z.object({
      name: z.string().describe("Name of the publication or blog"),
      url: z.string().url().describe("URL of the blog or RSS feed"),
      feedUrl: z.string().optional().describe("RSS/Atom feed URL if available"),
      description: z.string().describe("Brief description of the source"),
      domainType: z
        .enum(["evaluation", "policy", "research", "commentary"])
        .describe("Primary domain type"),
      sourceType: z
        .enum(["rss", "curated", "api"])
        .describe("How to fetch from this source"),
      suggestedTier: z
        .enum(["TIER_0", "TIER_1", "DISCOVERY"])
        .describe("Suggested trust tier"),
      rationale: z
        .string()
        .describe("Why this source is relevant for AGI tracking"),
    }),
  ),
});

export async function POST(request: NextRequest) {
  const authRes = await requireAuth();
  if (authRes) return authRes;

  try {
    const body = await request.json().catch(() => ({}));
    const keywords = (body as { keywords?: string[] }).keywords ?? [
      "AI research blog RSS feed",
      "AI safety publication",
      "AI benchmark evaluation results",
      "frontier AI model announcements",
      "AI policy government regulation",
      "machine learning research blog",
      "AGI research organization",
    ];

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured" },
        { status: 500 },
      );
    }

    // Get existing source domains for deduplication
    const db = getDb();
    const existingSources = await db
      .select({ url: sources.url, name: sources.name })
      .from(sources);

    const existingDomains = new Set(
      existingSources.map((s) => {
        try {
          return new URL(s.url).hostname.replace("www.", "");
        } catch {
          return s.url;
        }
      }),
    );

    const existingNames = existingSources.map((s) => s.name.toLowerCase());

    const prompt = `Find AI research blogs, publications, and RSS feeds that regularly publish about:
${keywords.map((k) => `- ${k}`).join("\n")}

We already track these sources (DO NOT include them):
${existingSources.map((s) => `- ${s.name} (${s.url})`).join("\n")}

Return 8-12 NEW sources we should track. Focus on:
1. Academic research labs with blogs or RSS feeds
2. AI safety organizations
3. Government AI policy bodies
4. Major AI companies' research blogs
5. AI evaluation/benchmark organizations
6. Notable independent researchers

Prioritize sources with RSS/Atom feeds. Include the feed URL when available.`;

    const result = await generateText({
      model: getOpenRouterModel(apiKey, WEB_SEARCH_MODEL),
      output: Output.object({ schema: DiscoveredSourceSchema }),
      prompt,
      abortSignal: AbortSignal.timeout(DISCOVER_TIMEOUT_MS),
    });

    const discovered = result.output?.sources ?? [];

    // Filter out sources that match existing domains
    const candidates = discovered.filter((s) => {
      try {
        const domain = new URL(s.url).hostname.replace("www.", "");
        const feedDomain = s.feedUrl
          ? new URL(s.feedUrl).hostname.replace("www.", "")
          : null;
        const isDuplicate =
          existingDomains.has(domain) ||
          (feedDomain && existingDomains.has(feedDomain)) ||
          existingNames.some(
            (n) =>
              s.name.toLowerCase().includes(n) ||
              n.includes(s.name.toLowerCase()),
          );
        return !isDuplicate;
      } catch {
        return true;
      }
    });

    return NextResponse.json({
      candidates,
      total: discovered.length,
      filtered: discovered.length - candidates.length,
    });
  } catch (err) {
    console.error("[api/admin/sources/discover] POST error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to discover sources",
      },
      { status: 500 },
    );
  }
}
