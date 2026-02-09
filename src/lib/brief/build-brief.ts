/**
 * Build DailyBrief from snapshot and signals.
 * @see docs/features/11-daily-brief.md
 */

import { desc, eq, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  dailySnapshots,
  documents,
  items,
  signals,
  sources,
} from "@/lib/db/schema";
import { AXES } from "@/lib/signal/schemas";
import type { BriefItem, DailyBrief, BriefDirection } from "@/lib/brief/types";
import { AXIS_LABELS } from "@/lib/brief/types";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function toDirection(delta: number): BriefDirection {
  if (delta > 0.005) return "up";
  if (delta < -0.005) return "down";
  return "stable";
}

export async function getBriefForDate(dateStr: string): Promise<{
  brief: DailyBrief;
  isExact: boolean;
}> {
  if (!DATE_REGEX.test(dateStr)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD.");
  }

  const db = getDb();

  const [snapshot] = await db
    .select()
    .from(dailySnapshots)
    .where(eq(dailySnapshots.date, dateStr))
    .limit(1);

  if (snapshot) {
    const movements = await buildMovementsFromSnapshot(db, snapshot, dateStr);
    const { sourcesChecked } = await countSourcesForSignalIds(
      db,
      snapshot.signalIds ?? [],
    );
    const brief: DailyBrief = {
      date: dateStr,
      resolvedDate: snapshot.date,
      isExact: true,
      movements: movements.slice(0, 5),
      coverageScore: snapshot.coverageScore
        ? Number(snapshot.coverageScore)
        : null,
      signalsProcessed: (snapshot.signalIds ?? []).length,
      sourcesChecked,
      generatedAt: snapshot.createdAt?.toISOString() ?? null,
    };
    return { brief, isExact: true };
  }

  // No snapshot: try nearest (e.g. yesterday) for "last updated" behavior
  const [nearest] = await db
    .select()
    .from(dailySnapshots)
    .where(lte(dailySnapshots.date, dateStr))
    .orderBy(desc(dailySnapshots.date))
    .limit(1);

  if (nearest) {
    const movements = await buildMovementsFromSnapshot(db, nearest, dateStr);
    const { sourcesChecked } = await countSourcesForSignalIds(
      db,
      nearest.signalIds ?? [],
    );
    const brief: DailyBrief = {
      date: dateStr,
      resolvedDate: nearest.date,
      isExact: false,
      movements: movements.slice(0, 5),
      coverageScore: nearest.coverageScore
        ? Number(nearest.coverageScore)
        : null,
      signalsProcessed: (nearest.signalIds ?? []).length,
      sourcesChecked,
      generatedAt: nearest.createdAt?.toISOString() ?? null,
    };
    return { brief, isExact: false };
  }

  // No snapshots at all: build from signals for this date
  const movements = await buildMovementsFromSignalsForDate(db, dateStr);
  const { signalsProcessed, sourcesChecked } =
    await countSignalsAndSourcesForDate(db, dateStr);

  const brief: DailyBrief = {
    date: dateStr,
    resolvedDate: dateStr,
    isExact: true,
    movements: movements.slice(0, 5),
    coverageScore: null,
    signalsProcessed,
    sourcesChecked,
    generatedAt: null,
  };
  return { brief, isExact: true };
}

async function buildMovementsFromSnapshot(
  db: ReturnType<typeof getDb>,
  snapshot: {
    axisScores: Record<
      string,
      { score?: number; uncertainty?: number; delta?: number }
    > | null;
    signalIds: string[] | null;
  },
  _dateStr: string,
): Promise<BriefItem[]> {
  const axisScores = snapshot.axisScores ?? {};
  const signalIds = snapshot.signalIds ?? [];
  const movements: BriefItem[] = [];

  if (signalIds.length === 0) {
    for (const axis of AXES) {
      const entry = axisScores[axis];
      if (!entry?.delta) continue;
      const delta = entry.delta ?? 0;
      movements.push({
        axis,
        axisLabel: AXIS_LABELS[axis] ?? axis,
        direction: toDirection(delta),
        delta,
        source: "",
        confidence: 0.5,
        signalId: "",
      });
    }
    movements.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return movements;
  }

  const signalRows = await db
    .select({
      id: signals.id,
      claimSummary: signals.claimSummary,
      axesImpacted: signals.axesImpacted,
      confidence: signals.confidence,
      documentId: signals.documentId,
    })
    .from(signals)
    .where(inArray(signals.id, signalIds));

  const docIds = [...new Set(signalRows.map((s) => s.documentId))];
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
          .select({ id: sources.id, name: sources.name })
          .from(sources)
          .where(inArray(sources.id, sourceIds))
      : [];
  const sourceMap = new Map(sourceRows.map((s) => [s.id, s]));

  const signalMeta = new Map(
    signalRows.map((sig) => {
      const doc = docMap.get(sig.documentId);
      const item = doc ? itemMap.get(doc.itemId) : undefined;
      const src = item ? sourceMap.get(item.sourceId) : undefined;
      return [
        sig.id,
        {
          sourceName: src?.name ?? "Unknown",
          confidence: Number(sig.confidence) || 0.5,
          claimSummary: sig.claimSummary ?? null,
          url: item?.url ?? null,
          axes: (sig.axesImpacted ?? []) as Array<{
            axis: string;
            direction: string;
            magnitude: number;
          }>,
        },
      ];
    }),
  );

  for (const axis of AXES) {
    const entry = axisScores[axis];
    const delta = entry?.delta ?? 0;
    if (Math.abs(delta) < 0.005) continue;

    let best: {
      signalId: string;
      magnitude: number;
      confidence: number;
    } | null = null;
    for (const [sigId, meta] of signalMeta) {
      const ax = meta.axes.find((a) => a.axis === axis);
      if (!ax) continue;
      const conf = meta.confidence;
      if (!best || ax.magnitude > best.magnitude || conf > best.confidence) {
        best = { signalId: sigId, magnitude: ax.magnitude, confidence: conf };
      }
    }
    const meta = best ? signalMeta.get(best.signalId) : undefined;
    movements.push({
      axis,
      axisLabel: AXIS_LABELS[axis] ?? axis,
      direction: toDirection(delta),
      delta,
      source: meta?.sourceName ?? "",
      confidence: meta?.confidence ?? 0.5,
      signalId: best?.signalId ?? "",
      claimSummary: meta?.claimSummary ?? undefined,
      url: meta?.url ?? undefined,
    });
  }

  movements.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return movements;
}

async function buildMovementsFromSignalsForDate(
  db: ReturnType<typeof getDb>,
  dateStr: string,
): Promise<BriefItem[]> {
  const rows = await db
    .select({
      id: signals.id,
      claimSummary: signals.claimSummary,
      axesImpacted: signals.axesImpacted,
      confidence: signals.confidence,
      documentId: signals.documentId,
    })
    .from(signals)
    .where(sql`${signals.createdAt}::date = ${dateStr}::date`)
    .orderBy(desc(signals.createdAt))
    .limit(100);

  const docIds = [...new Set(rows.map((s) => s.documentId))];
  if (docIds.length === 0) return [];

  const docs = await db
    .select({ id: documents.id, itemId: documents.itemId })
    .from(documents)
    .where(inArray(documents.id, docIds));
  const docMap = new Map(docs.map((d) => [d.id, d]));
  const itemIds = [
    ...new Set(docs.map((d) => d.itemId).filter(Boolean)),
  ] as string[];
  const itemRows = await db
    .select({ id: items.id, url: items.url, sourceId: items.sourceId })
    .from(items)
    .where(inArray(items.id, itemIds));
  const itemMap = new Map(itemRows.map((i) => [i.id, i]));
  const sourceIds = [
    ...new Set(itemRows.map((i) => i.sourceId).filter(Boolean)),
  ] as string[];
  const sourceRows =
    sourceIds.length > 0
      ? await db
          .select({ id: sources.id, name: sources.name })
          .from(sources)
          .where(inArray(sources.id, sourceIds))
      : [];
  const sourceMap = new Map(sourceRows.map((s) => [s.id, s]));

  const seen = new Set<string>();
  const movements: BriefItem[] = [];
  for (const sig of rows) {
    const axes = (sig.axesImpacted ?? []) as Array<{
      axis: string;
      direction: string;
      magnitude: number;
    }>;
    const doc = docMap.get(sig.documentId);
    const item = doc ? itemMap.get(doc.itemId) : undefined;
    const src = item ? sourceMap.get(item.sourceId) : undefined;
    for (const a of axes) {
      if (!AXES.includes(a.axis as (typeof AXES)[number]) || seen.has(a.axis))
        continue;
      seen.add(a.axis);
      const delta =
        a.direction === "up"
          ? a.magnitude
          : a.direction === "down"
            ? -a.magnitude
            : 0;
      movements.push({
        axis: a.axis,
        axisLabel: AXIS_LABELS[a.axis] ?? a.axis,
        direction: toDirection(delta),
        delta,
        source: src?.name ?? "Unknown",
        confidence: Number(sig.confidence) || 0.5,
        signalId: sig.id,
        claimSummary: sig.claimSummary ?? undefined,
        url: item?.url ?? undefined,
      });
    }
  }
  movements.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return movements;
}

async function countSourcesForSignalIds(
  db: ReturnType<typeof getDb>,
  signalIds: string[],
): Promise<{ sourcesChecked: number }> {
  if (signalIds.length === 0) return { sourcesChecked: 0 };
  const rows = await db
    .select({ documentId: signals.documentId })
    .from(signals)
    .where(inArray(signals.id, signalIds));
  const docIds = [...new Set(rows.map((r) => r.documentId))];
  const docs = await db
    .select({ itemId: documents.itemId })
    .from(documents)
    .where(inArray(documents.id, docIds));
  const itemIds = [
    ...new Set(docs.map((d) => d.itemId).filter(Boolean)),
  ] as string[];
  const itemsWithSource = await db
    .select({ sourceId: items.sourceId })
    .from(items)
    .where(inArray(items.id, itemIds));
  const uniqueSources = new Set(
    itemsWithSource.map((i) => i.sourceId).filter(Boolean),
  );
  return { sourcesChecked: uniqueSources.size };
}

async function countSignalsAndSourcesForDate(
  db: ReturnType<typeof getDb>,
  dateStr: string,
): Promise<{ signalsProcessed: number; sourcesChecked: number }> {
  const rows = await db
    .select({ documentId: signals.documentId })
    .from(signals)
    .where(sql`${signals.createdAt}::date = ${dateStr}::date`);
  const signalsProcessed = rows.length;
  if (rows.length === 0) return { signalsProcessed: 0, sourcesChecked: 0 };
  const docIds = [...new Set(rows.map((r) => r.documentId))];
  const docs = await db
    .select({ itemId: documents.itemId })
    .from(documents)
    .where(inArray(documents.id, docIds));
  const itemIds = [
    ...new Set(docs.map((d) => d.itemId).filter(Boolean)),
  ] as string[];
  const itemsWithSource = await db
    .select({ sourceId: items.sourceId })
    .from(items)
    .where(inArray(items.id, itemIds));
  const uniqueSources = new Set(
    itemsWithSource.map((i) => i.sourceId).filter(Boolean),
  );
  return { signalsProcessed, sourcesChecked: uniqueSources.size };
}
