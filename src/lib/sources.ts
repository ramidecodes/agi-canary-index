/**
 * Source registry constants and helpers.
 * @see docs/features/02-source-registry.md
 */

import type { InferSelectModel } from "drizzle-orm";
import type { sources } from "./db/schema";

/** Auto-disable source after this many consecutive failures. */
export const AUTO_DISABLE_FAILURE_THRESHOLD = 5;

export type SourceRow = InferSelectModel<typeof sources>;

export type SourceHealthStatus = "green" | "yellow" | "red";

/**
 * Derive health status from last_success_at and error_count.
 * - green: recent success (within cadence window) and low errors
 * - yellow: stale or some errors
 * - red: many errors (>= threshold) or never succeeded
 */
export function getSourceHealthStatus(
  source: Pick<SourceRow, "lastSuccessAt" | "errorCount">,
): SourceHealthStatus {
  if (source.errorCount >= AUTO_DISABLE_FAILURE_THRESHOLD) return "red";
  if (source.lastSuccessAt == null && source.errorCount > 0) return "yellow";
  if (source.lastSuccessAt == null) return "yellow"; // never fetched
  const ageMs = Date.now() - new Date(source.lastSuccessAt).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (ageMs > 7 * dayMs) return "yellow"; // stale > 7 days
  if (source.errorCount > 0) return "yellow";
  return "green";
}

/** Pre-configured Tier-0 and Tier-1 sources for seed. */
export const SEED_SOURCES: Array<{
  name: string;
  url: string;
  tier: "TIER_0" | "TIER_1" | "DISCOVERY";
  trustWeight: string;
  cadence: "daily" | "weekly" | "monthly";
  domainType: "evaluation" | "policy" | "research" | "commentary";
  sourceType: "rss" | "search" | "curated" | "api" | "x";
  queryConfig?: Record<string, unknown>;
}> = [
  // Tier-0
  {
    name: "Stanford HAI",
    url: "https://hai.stanford.edu/news",
    tier: "TIER_0",
    trustWeight: "0.95",
    cadence: "weekly",
    domainType: "research",
    sourceType: "curated",
  },
  {
    name: "METR",
    url: "https://metr.org/blog",
    tier: "TIER_0",
    trustWeight: "0.95",
    cadence: "weekly",
    domainType: "evaluation",
    sourceType: "rss",
  },
  {
    name: "ARC Prize",
    url: "https://arcprize.org/blog",
    tier: "TIER_0",
    trustWeight: "0.9",
    cadence: "monthly",
    domainType: "evaluation",
    sourceType: "rss",
  },
  {
    name: "OECD AI",
    url: "https://www.oecd.org/digital/artificial-intelligence/",
    tier: "TIER_0",
    trustWeight: "0.9",
    cadence: "monthly",
    domainType: "policy",
    sourceType: "curated",
  },
  {
    name: "DeepMind Research",
    url: "https://www.deepmind.com/blog",
    tier: "TIER_0",
    trustWeight: "0.95",
    cadence: "weekly",
    domainType: "research",
    sourceType: "rss",
  },
  {
    name: "OpenAI Research",
    url: "https://openai.com/research",
    tier: "TIER_0",
    trustWeight: "0.95",
    cadence: "weekly",
    domainType: "research",
    sourceType: "curated",
  },
  {
    name: "Anthropic Research",
    url: "https://www.anthropic.com/research",
    tier: "TIER_0",
    trustWeight: "0.95",
    cadence: "weekly",
    domainType: "research",
    sourceType: "curated",
  },
  {
    name: "Epoch AI",
    url: "https://epochai.org/blog",
    tier: "TIER_0",
    trustWeight: "0.85",
    cadence: "weekly",
    domainType: "research",
    sourceType: "rss",
  },
  {
    name: "UK AISI",
    url: "https://www.aisi.gov.uk/",
    tier: "TIER_0",
    trustWeight: "0.9",
    cadence: "monthly",
    domainType: "policy",
    sourceType: "curated",
  },
  {
    name: "arXiv cs.AI",
    url: "http://arxiv.org/list/cs.AI/recent",
    tier: "TIER_0",
    trustWeight: "0.8",
    cadence: "daily",
    domainType: "research",
    sourceType: "curated",
    queryConfig: {
      categories: ["cs.AI", "cs.LG"],
      keywords: ["AGI", "capability", "benchmark"],
    },
  },
  // Tier-1
  {
    name: "LessWrong",
    url: "https://www.lesswrong.com/feed",
    tier: "TIER_1",
    trustWeight: "0.6",
    cadence: "daily",
    domainType: "commentary",
    sourceType: "rss",
  },
  {
    name: "Alignment Forum",
    url: "https://www.alignmentforum.org/feed",
    tier: "TIER_1",
    trustWeight: "0.65",
    cadence: "daily",
    domainType: "commentary",
    sourceType: "rss",
  },
  {
    name: "Import AI newsletter",
    url: "https://jack-clark.net/",
    tier: "TIER_1",
    trustWeight: "0.6",
    cadence: "weekly",
    domainType: "commentary",
    sourceType: "curated",
  },
  {
    name: "Center for AI Safety",
    url: "https://www.safe.ai/blog",
    tier: "TIER_1",
    trustWeight: "0.65",
    cadence: "weekly",
    domainType: "commentary",
    sourceType: "rss",
  },
  // Discovery tier - Perplexity web search
  {
    name: "Perplexity AGI Search",
    url: "https://openrouter.ai/perplexity/sonar",
    tier: "DISCOVERY",
    trustWeight: "0.4",
    cadence: "daily",
    domainType: "research",
    sourceType: "search",
    queryConfig: {
      keywords: [
        "AGI evaluation",
        "AI benchmark",
        "ARC-AGI",
        "frontier model",
        "AI capability",
        "METR evaluation",
        "OECD AI",
      ],
    },
  },
];
