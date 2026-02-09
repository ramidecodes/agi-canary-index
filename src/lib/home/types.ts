/**
 * Types for Home Page (Control Room) data.
 * @see docs/features/06-home-page.md
 */

export interface AxisScore {
  score: number;
  uncertainty?: number;
  delta?: number;
}

export interface Snapshot {
  id: string;
  date: string;
  axisScores: Record<string, AxisScore>;
  canaryStatuses: Array<{
    canary_id: string;
    status: string;
    last_change?: string;
    confidence?: number;
  }>;
  coverageScore: number | null;
  signalIds: string[];
  notes: string[];
  createdAt: string | null;
}

export interface SnapshotHistoryEntry {
  date: string;
  axisScores: Record<string, AxisScore>;
}

export interface Canary {
  id: string;
  name: string;
  description: string;
  axesWatched: string[];
  thresholds: Record<string, unknown>;
  displayOrder: number;
  status: "green" | "yellow" | "red" | "gray";
  lastChange?: string;
  confidence?: number;
}

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

export interface Movement {
  axis: string;
  label: string;
  direction: "up" | "down" | "neutral";
  delta: number;
  source?: string;
}
