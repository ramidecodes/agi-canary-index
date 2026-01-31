/**
 * Admin sources API: list and create.
 * GET /api/admin/sources - list all sources
 * POST /api/admin/sources - create source
 * @see docs/features/02-source-registry.md
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { insertSourceSchema, type InsertSource } from "@/lib/db/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select().from(sources).orderBy(sources.name);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/admin/sources:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list sources" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = insertSourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data as Omit<
      InsertSource,
      "id" | "createdAt" | "updatedAt" | "lastSuccessAt" | "errorCount"
    > & {
      trustWeight?: string;
      isActive?: boolean;
    };
    const db = getDb();
    const [inserted] = await db
      .insert(sources)
      .values({
        name: data.name,
        url: data.url,
        tier: data.tier,
        trustWeight: data.trustWeight ?? "1",
        cadence: data.cadence,
        domainType: data.domainType,
        sourceType: data.sourceType,
        queryConfig: data.queryConfig ?? undefined,
        isActive: data.isActive ?? true,
      })
      .returning();
    return NextResponse.json(inserted);
  } catch (err) {
    console.error("POST /api/admin/sources:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create source" },
      { status: 500 },
    );
  }
}
