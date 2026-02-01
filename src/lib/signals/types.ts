/**
 * Types for Signal Explorer page.
 * @see docs/features/10-signal-explorer.md
 */

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
  classification: "benchmark" | "claim";
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
