/**
 * Admin source by ID: update.
 * PATCH /api/admin/sources/[id]
 * @see docs/features/02-source-registry.md
 */

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { updateSourceSchema } from "@/lib/db/validators";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  try {
    const body = (await request.json()) as unknown;
    const parsed = updateSourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data as Record<string, unknown>;
    const allowed = [
      "name",
      "url",
      "tier",
      "trustWeight",
      "cadence",
      "domainType",
      "sourceType",
      "queryConfig",
      "isActive",
    ] as const;
    const set: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of allowed) {
      if (data[k] !== undefined) set[k] = data[k];
    }
    const db = getDb();
    const [updated] = await db
      .update(sources)
      .set(set)
      .where(eq(sources.id, id))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/admin/sources/[id]:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update source" },
      { status: 500 },
    );
  }
}
