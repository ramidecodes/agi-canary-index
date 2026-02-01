/**
 * Types for discovery pipeline.
 * @see docs/features/03-discovery-pipeline.md
 */

export interface DiscoveredItem {
  url: string;
  urlHash: string;
  title: string | null;
  publishedAt: Date | null;
  sourceId: string;
  snippet?: string;
}

export interface DiscoveryResult {
  items: DiscoveredItem[];
  success: boolean;
  error?: string;
}

export interface DiscoveryRunStats {
  itemsDiscovered: number;
  itemsInserted: number;
  /** IDs of newly inserted items (for acquisition trigger) */
  insertedItemIds?: string[];
  sourcesSucceeded: number;
  sourcesFailed: number;
  durationMs: number;
  /** True when discovery was skipped because a run was already in progress. */
  skipped?: boolean;
  /** Reason when skipped (e.g. "run_already_in_progress"). */
  skipReason?: string;
  perSource: Array<{
    sourceId: string;
    sourceName: string;
    itemsFound: number;
    success: boolean;
    error?: string;
  }>;
}
