/**
 * Manual acquisition pipeline trigger.
 * POST /api/admin/pipeline/acquire
 * Body: { itemIds?: string[]; continue?: boolean }
 * Proxies to Worker /acquire when ACQUISITION_WORKER_URL is set.
 * @see docs/features/04-acquisition-pipeline.md
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const authRes = await requireAuth();
  if (authRes) return authRes;

  const workerUrl = process.env.ACQUISITION_WORKER_URL;
  if (!workerUrl) {
    return NextResponse.json(
      {
        error: "ACQUISITION_WORKER_URL not configured",
        hint: "Set ACQUISITION_WORKER_URL in Vercel env (e.g. https://agi-canary-pipeline-dev.xxx.workers.dev)",
      },
      { status: 503 }
    );
  }

  let body: { itemIds?: string[]; continue?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // Empty body ok
  }

  const token = process.env.DISCOVERY_TRIGGER_TOKEN;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${workerUrl.replace(/\/$/, "")}/acquire`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? "Acquisition failed", ok: false },
        { status: res.status }
      );
    }
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Acquisition request failed";
    return NextResponse.json({ error: msg, ok: false }, { status: 502 });
  }
}
