/**
 * Bulk actions on sources: enable, disable, change tier.
 * POST /api/admin/sources/bulk - body: { sourceIds, action, tier? }
 * @see docs/features/02-source-registry.md
 */

import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sources } from "@/lib/db/schema";
import { bulkSourcesActionSchema } from "@/lib/db/validators";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authRes = await requireAuth();
  if (authRes) return authRes;
  try {
    const body = (await request.json()) as unknown;
    const parsed = bulkSourcesActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { sourceIds, action, tier } = parsed.data;
    if (action === "change_tier" && tier == null) {
      return NextResponse.json(
        { error: "tier is required when action is change_tier" },
        { status: 400 },
      );
    }

    const db = getDb();
    const updates: Record<string, unknown> = {};
    if (action === "enable") updates.isActive = true;
    if (action === "disable") updates.isActive = false;
    if (action === "change_tier" && tier) updates.tier = tier;
    updates.updatedAt = new Date();

    const result = await db
      .update(sources)
      .set(updates as Record<string, unknown>)
      .where(inArray(sources.id, sourceIds))
      .returning({ id: sources.id });

    return NextResponse.json({
      updated: result.length,
      ids: result.map((r) => r.id),
    });
  } catch (err) {
    console.error("POST /api/admin/sources/bulk:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Bulk action failed",
      },
      { status: 500 },
    );
  }
}
