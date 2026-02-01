/**
 * Types for Capability Profile page and APIs.
 * @see docs/features/07-capability-profile.md
 */

export interface AxisHistoryPoint {
  date: string;
  score: number;
  uncertainty: number;
  scorePct: number;
  low: number;
  high: number;
}

export interface AxisSourceEntry {
  signalId: string;
  claimSummary: string;
  confidence: number;
  magnitude?: number;
  uncertainty?: number;
  publishedAt: string | null;
  documentAcquiredAt: string | null;
  title: string | null;
  url: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceTier: string | null;
}

export interface SnapshotRange {
  minDate: string | null;
  maxDate: string | null;
}
