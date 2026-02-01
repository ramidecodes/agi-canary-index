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
  perSource: Array<{
    sourceId: string;
    sourceName: string;
    itemsFound: number;
    success: boolean;
    error?: string;
  }>;
}
