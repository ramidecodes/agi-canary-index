/**
 * Types for Signal Explorer page.
 * @see docs/features/10-signal-explorer.md
 */

/** Classification types matching the AI extraction schema. */
export type SignalClassification =
  | "benchmark_result"
  | "policy_update"
  | "research_finding"
  | "opinion"
  | "announcement"
  | "other";

export const CLASSIFICATION_LABELS: Record<SignalClassification, string> = {
  benchmark_result: "Benchmark",
  policy_update: "Policy",
  research_finding: "Research",
  opinion: "Opinion",
  announcement: "Announcement",
  other: "Other",
};

export const CLASSIFICATION_COLORS: Record<SignalClassification, string> = {
  benchmark_result: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  policy_update: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  research_finding: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  opinion: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30",
  announcement: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30",
  other: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30",
};

export interface SignalExplorerItem {
  id: string;
  signalId: string;
  claimSummary: string;
  axesImpacted: Array<{
    axis: string;
    direction: string;
    magnitude: number;
    uncertainty?: number;
  }> | null;
  metric: { name: string; value: number; unit?: string } | null;
  confidence: number;
  classification: SignalClassification;
  createdAt: string;
  title: string | null;
  url: string | null;
  sourceId: string | null;
  sourceName: string | null;
  sourceTier: string | null;
  sourceUrl: string | null;
}

export interface SignalDetail extends SignalExplorerItem {
  citations: Array<{ url?: string; quoted_span?: string }>;
  scoringVersion: string;
  documentId: string;
}

/** Validate a string as a known classification, with fallback. */
export function toClassification(raw: string | null | undefined): SignalClassification {
  const valid: SignalClassification[] = [
    "benchmark_result",
    "policy_update",
    "research_finding",
    "opinion",
    "announcement",
    "other",
  ];
  if (raw && valid.includes(raw as SignalClassification)) {
    return raw as SignalClassification;
  }
  return "other";
}

export const AXIS_LABELS: Record<string, string> = {
  reasoning: "Reasoning",
  learning_efficiency: "Learning",
  long_term_memory: "Memory",
  planning: "Planning",
  tool_use: "Tool Use",
  social_cognition: "Social",
  multimodal_perception: "Multimodal",
  robustness: "Robustness",
  alignment_safety: "Alignment",
};

export const TIER_LABELS: Record<string, string> = {
  TIER_0: "Tier 0",
  TIER_1: "Tier 1",
  DISCOVERY: "Discovery",
};
