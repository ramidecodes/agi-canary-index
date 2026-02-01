/**
 * GET /api/signals/recent?axes=tool_use,planning,alignment_safety&limit=20
 * Returns recent signals affecting autonomy-related axes (for trigger log).
 * @see docs/features/08-autonomy-risk.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { desc, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  dailySnapshots,
  documents,
  items,
  signals,
  sources,
} from "@/lib/db/schema";

const AUTONOMY_AXES = ["tool_use", "planning", "alignment_safety"] as const;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const axesParam = searchParams.get("axes");
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") ?? "20", 10),
      50,
    );

    const axes = axesParam
      ? axesParam
          .split(",")
          .map((a) => a.trim())
          .filter((a) => (AUTONOMY_AXES as readonly string[]).includes(a))
      : [...AUTONOMY_AXES];

    if (axes.length === 0) {
      return NextResponse.json(
        {
          error: `axes must include at least one of: ${AUTONOMY_AXES.join(
            ", ",
          )}`,
        },
        { status: 400 },
      );
    }

    const db = getDb();

    const [latest] = await db
      .select({ signalIds: dailySnapshots.signalIds })
      .from(dailySnapshots)
      .orderBy(desc(dailySnapshots.date))
      .limit(1);
    const signalIds = latest?.signalIds ?? null;

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
      .limit(signalIds ? signalIds.length + 100 : 300);

    const filtered = allSignals.filter((s) => {
      const impacted = s.axesImpacted as Array<{ axis: string }> | null;
      const matchesAxis = impacted?.some((a) => axes.includes(a.axis)) ?? false;
      if (signalIds && signalIds.length > 0) {
        return matchesAxis && signalIds.includes(s.id);
      }
      return matchesAxis;
    });

    const slice = filtered.slice(0, limit);
    const docIds = [...new Set(slice.map((s) => s.documentId))];

    if (docIds.length === 0) {
      return NextResponse.json({
        triggers: slice.map((sig) => {
          const impact = (
            sig.axesImpacted as Array<{ axis: string; magnitude?: number }>
          )?.filter((a) => axes.includes(a.axis));
          return {
            signalId: sig.id,
            claimSummary: sig.claimSummary,
            confidence: Number(sig.confidence),
            axesAffected: impact?.map((i) => i.axis) ?? [],
            createdAt:
              sig.createdAt instanceof Date
                ? sig.createdAt.toISOString()
                : String(sig.createdAt ?? null),
            sourceName: null,
            sourceUrl: null,
            documentUrl: null,
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

    const triggers = slice.map((sig) => {
      const doc = docMap.get(sig.documentId);
      const item = doc ? itemMap.get(doc.itemId) : undefined;
      const src = item ? sourceMap.get(item.sourceId) : undefined;
      const impact = (
        sig.axesImpacted as Array<{ axis: string; magnitude?: number }>
      )?.filter((a) => axes.includes(a.axis));
      return {
        signalId: sig.id,
        claimSummary: sig.claimSummary,
        confidence: Number(sig.confidence),
        axesAffected: impact?.map((i) => i.axis) ?? [],
        createdAt:
          sig.createdAt instanceof Date
            ? sig.createdAt.toISOString()
            : String(sig.createdAt ?? null),
        sourceName: src?.name ?? null,
        sourceUrl: src?.url ?? null,
        documentUrl: item?.url ?? null,
      };
    });

    return NextResponse.json({ triggers });
  } catch (err) {
    console.error("[api/signals/recent]", err);
    return NextResponse.json(
      { error: "Failed to fetch recent signals" },
      { status: 500 },
    );
  }
}
