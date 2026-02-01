/**
 * GET /api/axis/[axis]/sources?limit=50
 * Returns sources (signals + document/source metadata) contributing to an axis.
 * @see docs/features/07-capability-profile.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { desc, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { documents, items, signals, sources } from "@/lib/db/schema";
import { AXES } from "@/lib/signal/schemas";

export const dynamic = "force-dynamic";

function isValidAxis(axis: string): boolean {
  return AXES.includes(axis as (typeof AXES)[number]);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ axis: string }> },
) {
  try {
    const { axis } = await params;
    if (!isValidAxis(axis)) {
      return NextResponse.json(
        { error: `Invalid axis. Must be one of: ${AXES.join(", ")}` },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") ?? "50", 10),
      100,
    );

    const db = getDb();

    const allSignals = await db
      .select({
        id: signals.id,
        claimSummary: signals.claimSummary,
        axesImpacted: signals.axesImpacted,
        confidence: signals.confidence,
        createdAt: signals.createdAt,
        documentId: signals.documentId,
      })
      .from(signals)
      .orderBy(desc(signals.createdAt))
      .limit(500);

    const filtered = allSignals.filter((s) => {
      const impacted = s.axesImpacted as Array<{ axis: string }> | null;
      return impacted?.some((a) => a.axis === axis) ?? false;
    });

    const slice = filtered.slice(0, limit);
    const docIds = [...new Set(slice.map((s) => s.documentId))];

    if (docIds.length === 0) {
      return NextResponse.json({ axis, sources: [] });
    }

    const docs = await db
      .select({
        id: documents.id,
        itemId: documents.itemId,
        acquiredAt: documents.acquiredAt,
      })
      .from(documents)
      .where(inArray(documents.id, docIds));

    const docMap = new Map(docs.map((d) => [d.id, d]));
    const itemIds = [
      ...new Set(docs.map((d) => d.itemId).filter(Boolean)),
    ] as string[];

    if (itemIds.length === 0) {
      const sourcesOut = slice.map((sig) => {
        const doc = docMap.get(sig.documentId);
        const impact = (
          sig.axesImpacted as Array<{
            axis: string;
            magnitude: number;
            uncertainty?: number;
          }>
        )?.find((a) => a.axis === axis);
        return {
          signalId: sig.id,
          claimSummary: sig.claimSummary,
          confidence: Number(sig.confidence),
          magnitude: impact?.magnitude,
          uncertainty: impact?.uncertainty,
          publishedAt: null,
          documentAcquiredAt: doc?.acquiredAt?.toISOString() ?? null,
          title: null,
          url: null,
          sourceName: null,
          sourceUrl: null,
          sourceTier: null,
        };
      });
      return NextResponse.json({ axis, sources: sourcesOut });
    }

    const itemRows = await db
      .select({
        id: items.id,
        title: items.title,
        url: items.url,
        sourceId: items.sourceId,
        publishedAt: items.publishedAt,
      })
      .from(items)
      .where(inArray(items.id, itemIds));

    const itemMap = new Map(itemRows.map((i) => [i.id, i]));
    const sourceIds = [
      ...new Set(itemRows.map((i) => i.sourceId).filter(Boolean)),
    ] as string[];

    const sourceRows =
      sourceIds.length > 0
        ? await db
            .select({
              id: sources.id,
              name: sources.name,
              url: sources.url,
              tier: sources.tier,
            })
            .from(sources)
            .where(inArray(sources.id, sourceIds))
        : [];

    const sourceMap = new Map(sourceRows.map((s) => [s.id, s]));

    const sourcesOut = slice.map((sig) => {
      const doc = docMap.get(sig.documentId);
      const item = doc ? itemMap.get(doc.itemId) : undefined;
      const src = item ? sourceMap.get(item.sourceId) : undefined;
      const impact = (
        sig.axesImpacted as Array<{
          axis: string;
          magnitude: number;
          uncertainty?: number;
        }>
      )?.find((a) => a.axis === axis);
      return {
        signalId: sig.id,
        claimSummary: sig.claimSummary,
        confidence: Number(sig.confidence),
        magnitude: impact?.magnitude,
        uncertainty: impact?.uncertainty,
        publishedAt: item?.publishedAt?.toISOString() ?? null,
        documentAcquiredAt: doc?.acquiredAt?.toISOString() ?? null,
        title: item?.title ?? null,
        url: item?.url ?? null,
        sourceName: src?.name ?? null,
        sourceUrl: src?.url ?? null,
        sourceTier: src?.tier ?? null,
      };
    });

    return NextResponse.json({ axis, sources: sourcesOut });
  } catch (err) {
    console.error("[api/axis/[axis]/sources]", err);
    return NextResponse.json(
      { error: "Failed to fetch axis sources" },
      { status: 500 },
    );
  }
}
