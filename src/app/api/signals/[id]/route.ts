/**
 * GET /api/signals/[id]
 * Returns full signal detail with provenance (document, item, source).
 * @see docs/features/10-signal-explorer.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { documents, items, signals, sources } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Signal ID required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const [row] = await db
      .select({
        id: signals.id,
        claimSummary: signals.claimSummary,
        axesImpacted: signals.axesImpacted,
        metric: signals.metric,
        confidence: signals.confidence,
        citations: signals.citations,
        scoringVersion: signals.scoringVersion,
        createdAt: signals.createdAt,
        documentId: signals.documentId,
        title: items.title,
        url: items.url,
        sourceId: sources.id,
        sourceName: sources.name,
        sourceTier: sources.tier,
        sourceUrl: sources.url,
      })
      .from(signals)
      .innerJoin(documents, eq(signals.documentId, documents.id))
      .innerJoin(items, eq(documents.itemId, items.id))
      .innerJoin(sources, eq(items.sourceId, sources.id))
      .where(eq(signals.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    const confidence = Number(row.confidence);

    return NextResponse.json({
      id: row.id,
      claimSummary: row.claimSummary,
      axesImpacted: row.axesImpacted ?? [],
      metric: row.metric,
      confidence,
      citations: row.citations ?? [],
      scoringVersion: row.scoringVersion,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
      documentId: row.documentId,
      title: row.title ?? null,
      url: row.url ?? null,
      sourceId: row.sourceId ?? null,
      sourceName: row.sourceName ?? null,
      sourceTier: row.sourceTier ?? null,
      sourceUrl: row.sourceUrl ?? null,
      classification: row.metric != null ? "benchmark" : "claim",
    });
  } catch (err) {
    console.error("[api/signals/[id]]", err);
    return NextResponse.json(
      { error: "Failed to fetch signal" },
      { status: 500 }
    );
  }
}
