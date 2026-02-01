/**
 * GET /api/signals?axis=X&date=Y&limit=50
 * Returns signals for a specific axis and optional date (snapshot date).
 * @see docs/features/07-capability-profile.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  dailySnapshots,
  documents,
  items,
  signals,
  sources,
} from "@/lib/db/schema";
import { AXES } from "@/lib/signal/schemas";

export const dynamic = "force-dynamic";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidAxis(axis: string): boolean {
  return AXES.includes(axis as (typeof AXES)[number]);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const axisParam = searchParams.get("axis");
    const dateParam = searchParams.get("date");
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") ?? "50", 10),
      100
    );

    if (!axisParam || !isValidAxis(axisParam)) {
      return NextResponse.json(
        { error: `axis is required and must be one of: ${AXES.join(", ")}` },
        { status: 400 }
      );
    }

    const db = getDb();

    let signalIds: string[] | null = null;
    if (dateParam && DATE_REGEX.test(dateParam)) {
      const [snap] = await db
        .select({ signalIds: dailySnapshots.signalIds })
        .from(dailySnapshots)
        .where(eq(dailySnapshots.date, dateParam))
        .limit(1);
      signalIds = snap?.signalIds ?? null;
    }

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
      .limit(signalIds ? signalIds.length + 100 : 500);

    const filtered = allSignals.filter((s) => {
      const impacted = s.axesImpacted as Array<{ axis: string }> | null;
      const matchesAxis = impacted?.some((a) => a.axis === axisParam) ?? false;
      if (signalIds && signalIds.length > 0) {
        return matchesAxis && signalIds.includes(s.id);
      }
      return matchesAxis;
    });

    const slice = filtered.slice(0, limit);
    const docIds = [...new Set(slice.map((s) => s.documentId))];

    if (docIds.length === 0) {
      return NextResponse.json({
        signals: slice.map((sig) => {
          const impact = (
            sig.axesImpacted as Array<{
              axis: string;
              magnitude: number;
              uncertainty?: number;
            }>
          )?.find((a) => a.axis === axisParam);
          return {
            signalId: sig.id,
            claimSummary: sig.claimSummary,
            confidence: Number(sig.confidence),
            magnitude: impact?.magnitude,
            uncertainty: impact?.uncertainty,
            createdAt:
              sig.createdAt instanceof Date
                ? sig.createdAt.toISOString()
                : String(sig.createdAt ?? null),
            title: null,
            url: null,
            sourceName: null,
          };
        }),
      });
    }

    const docs = await db
      .select({ id: documents.id, itemId: documents.itemId })
      .from(documents)
      .where(inArray(documents.id, docIds));
    const docMap = new Map(docs.map((d) => [d.id, d]));
    const itemIds = [
      ...new Set(docs.map((d) => d.itemId).filter(Boolean)),
    ] as string[];

    const itemRows = await db
      .select({
        id: items.id,
        title: items.title,
        url: items.url,
        sourceId: items.sourceId,
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
            .select({ id: sources.id, name: sources.name, url: sources.url })
            .from(sources)
            .where(inArray(sources.id, sourceIds))
        : [];
    const sourceMap = new Map(sourceRows.map((s) => [s.id, s]));

    const signalsOut = slice.map((sig) => {
      const doc = docMap.get(sig.documentId);
      const item = doc ? itemMap.get(doc.itemId) : undefined;
      const src = item ? sourceMap.get(item.sourceId) : undefined;
      const impact = (
        sig.axesImpacted as Array<{
          axis: string;
          magnitude: number;
          uncertainty?: number;
        }>
      )?.find((a) => a.axis === axisParam);
      return {
        signalId: sig.id,
        claimSummary: sig.claimSummary,
        confidence: Number(sig.confidence),
        magnitude: impact?.magnitude,
        uncertainty: impact?.uncertainty,
        createdAt:
          sig.createdAt instanceof Date
            ? sig.createdAt.toISOString()
            : String(sig.createdAt ?? null),
        title: item?.title ?? null,
        url: item?.url ?? null,
        sourceName: src?.name ?? null,
      };
    });

    return NextResponse.json({ signals: signalsOut });
  } catch (err) {
    console.error("[api/signals]", err);
    return NextResponse.json(
      { error: "Failed to fetch signals" },
      { status: 500 }
    );
  }
}
