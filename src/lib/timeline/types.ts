/**
 * Types for Timeline page and APIs.
 * @see docs/features/09-timeline-page.md
 */

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  eventType: "reality" | "fiction" | "speculative";
  category: string;
  sourceUrl: string | null;
  axesImpacted: string[];
  isMilestone: boolean;
  significance: number;
}

export type TimelineCategory = "benchmark" | "model" | "policy" | "research";
