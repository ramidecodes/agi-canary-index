/**
 * Test fetch a source URL (validate before save).
 * POST /api/admin/sources/test-fetch - body: { url, sourceType? }
 * Timeout: 30s. Follows redirects up to 3 hops.
 * @see docs/features/02-source-registry.md
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
const TEST_FETCH_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 3;

export async function POST(request: Request) {
  const authRes = await requireAuth();
  if (authRes) return authRes;
  try {
    const body = (await request.json()) as {
      url?: string;
      sourceType?: string;
    };
    const url = body?.url;
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid url" },
        { status: 400 },
      );
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json(
        { error: "Only http and https URLs are allowed" },
        { status: 400 },
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      TEST_FETCH_TIMEOUT_MS,
    );
    let redirectCount = 0;
    let lastUrl = url;
    let lastRes: Response | null = null;

    try {
      while (redirectCount <= MAX_REDIRECTS) {
        const res = await fetch(lastUrl, {
          method: "GET",
          signal: controller.signal,
          redirect: "manual",
          headers: {
            "User-Agent": "AGI-Canary-Watcher/1.0 (Source Registry Test Fetch)",
          },
        });
        lastRes = res;
        clearTimeout(timeoutId);

        const location = res.headers.get("location");
        if (res.status >= 300 && res.status < 400 && location) {
          redirectCount++;
          lastUrl = new URL(location, lastUrl).href;
          continue;
        }
        break;
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (lastRes == null) {
      return NextResponse.json(
        { error: "Request failed", ok: false },
        { status: 502 },
      );
    }

    const contentType = lastRes.headers.get("content-type") ?? "";
    const isXml =
      contentType.includes("xml") ||
      lastRes.url.endsWith(".rss") ||
      lastRes.url.endsWith(".xml");

    return NextResponse.json({
      ok: lastRes.ok,
      status: lastRes.status,
      url: lastRes.url,
      contentType: contentType.slice(0, 80),
      isXml,
      redirects: redirectCount,
      message: lastRes.ok ? "Fetch succeeded." : `HTTP ${lastRes.status}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Test fetch failed";
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: isTimeout ? "Request timed out (30s)" : message,
        ok: false,
      },
      { status: isTimeout ? 408 : 502 },
    );
  }
}
