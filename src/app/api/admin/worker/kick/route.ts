/**
 * Admin API to kick the Cloudflare Worker runner.
 * POST /api/admin/worker/kick - Proxies request to Worker (keeps INTERNAL_TOKEN server-side)
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const authError = await requireAuth();
  if (authError) return authError;

  const workerUrl = process.env.WORKER_URL;
  const internalToken = process.env.INTERNAL_TOKEN;

  if (!workerUrl) {
    return NextResponse.json(
      { ok: false, error: "WORKER_URL not configured" },
      { status: 500 },
    );
  }

  if (!internalToken) {
    return NextResponse.json(
      { ok: false, error: "INTERNAL_TOKEN not configured" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${workerUrl}/run`, {
      method: "POST",
      headers: { Authorization: `Bearer ${internalToken}` },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || "Worker request failed" },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
