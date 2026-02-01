/**
 * Types for Daily Brief and News.
 * @see docs/features/11-daily-brief.md
 */

export type BriefDirection = "up" | "down" | "stable";

export interface BriefItem {
  axis: string;
  axisLabel: string;
  direction: BriefDirection;
  delta: number;
  source: string;
  confidence: number;
  signalId: string;
  claimSummary?: string;
  url?: string | null;
}

export interface DailyBrief {
  date: string;
  resolvedDate: string;
  isExact: boolean;
  movements: BriefItem[];
  coverageScore: number | null;
  signalsProcessed: number;
  sourcesChecked: number;
  generatedAt: string | null;
}

export interface BriefArchiveEntry {
  date: string;
  coverageScore: number | null;
  signalsProcessed: number;
  movementCount: number;
}

export interface NewsArticle {
  id: string;
  documentId: string;
  title: string | null;
  url: string | null;
  sourceName: string | null;
  sourceTier: string | null;
  publishedAt: string | null;
  tags: string[];
  whyItMatters: string | null;
  confidence: number;
  signalId: string;
  createdAt: string;
}

export interface NewsFiltersOptions {
  axes: { value: string; label: string }[];
  dateRange: { minDate: string | null; maxDate: string | null };
  sourceTiers: { value: string; label: string }[];
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
