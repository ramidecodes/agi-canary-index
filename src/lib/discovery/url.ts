/**
 * URL canonicalization and hashing for discovery pipeline deduplication.
 * @see docs/features/03-discovery-pipeline.md
 */

/** Tracking params to strip (utm_*, fbclid, gclid, etc.) */
const STRIP_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "gclsrc",
  "dclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "_ga",
  "_gl",
  "ref",
  "source",
]);

/**
 * Canonicalize a URL for deduplication.
 * - Strips tracking parameters (utm_*, fbclid, etc.)
 * - Removes fragment unless semantically meaningful
 * - Normalizes protocol (prefer https)
 * - Lowercases host
 */
export function canonicalizeUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return raw;
  }
  // Normalize protocol
  if (url.protocol === "http:") {
    url.protocol = "https:";
  }
  if (url.protocol !== "https:") {
    return raw; // Leave non-http(s) as-is
  }
  // Lowercase host
  url.hostname = url.hostname.toLowerCase();
  // Strip tracking params
  const params = url.searchParams;
  for (const key of Array.from(params.keys())) {
    const lower = key.toLowerCase();
    if (STRIP_PARAMS.has(lower) || lower.startsWith("utm_")) {
      params.delete(key);
    }
  }
  // Remove fragment (rarely semantically meaningful for dedup)
  url.hash = "";
  // Sort params for consistency (optional, but helps)
  url.searchParams.sort();
  return url.toString();
}

/**
 * Generate SHA-256 hash of canonical URL for fast deduplication lookup.
 * Uses Web Crypto API (available in Workers and Node 18+).
 */
export async function urlHash(canonicalUrl: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(canonicalUrl);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
