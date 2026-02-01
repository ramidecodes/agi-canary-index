/**
 * Discovery pipeline - public API.
 * @see docs/features/03-discovery-pipeline.md
 */

export { runDiscovery } from "./run";
export type { DiscoveryOptions, DiscoveryContext } from "./run";
export { canonicalizeUrl, urlHash } from "./url";
export type {
  DiscoveredItem,
  DiscoveryResult,
  DiscoveryRunStats,
} from "./types";
