"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CapabilityRadar } from "@/components/home/capability-radar";
import { TimeScrubber } from "./time-scrubber";
import { DomainBreakdown } from "./domain-breakdown";
import { SourceMapPanel } from "./source-map-panel";
import { AxisDetailModal } from "./axis-detail-modal";
import { FilterToggles } from "./filter-toggles";
import { useCapabilityProfileStore } from "@/lib/capabilities/store";
import type { Snapshot } from "@/lib/home/types";
import type { SnapshotHistoryEntry } from "@/lib/home/types";
import type {
  AxisHistoryPoint,
  AxisSourceEntry,
} from "@/lib/capabilities/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function CapabilityProfileClient() {
  const searchParams = useSearchParams();
  const { selectedDate, setSelectedDate, activeAxis, setActiveAxis } =
    useCapabilityProfileStore();

  const dateFromUrl = searchParams.get("date");
  const axisFromUrl = searchParams.get("axis");
  const [showSourceMap, setShowSourceMap] = useState(false);
  const [sourceMapAxis, setSourceMapAxis] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: _rangeData } = useSWR<{
    minDate: string | null;
    maxDate: string | null;
  }>("/api/snapshot/range", fetcher, { revalidateOnFocus: false });

  const { data: historyData } = useSWR<{ history: SnapshotHistoryEntry[] }>(
    "/api/snapshot/history?days=365",
    fetcher,
    { revalidateOnFocus: false },
  );

  const availableDates = useMemo(() => {
    const h = historyData?.history ?? [];
    return [...h].reverse().map((e) => e.date);
  }, [historyData?.history]);

  const effectiveDate =
    selectedDate ??
    dateFromUrl ??
    availableDates[availableDates.length - 1] ??
    null;

  const { data: snapshotData } = useSWR<{
    snapshot: Snapshot | null;
    resolvedDate?: string | null;
    isExact?: boolean;
  }>(effectiveDate ? `/api/snapshot/${effectiveDate}` : null, fetcher, {
    revalidateOnFocus: false,
  });

  const { data: axisHistoryData } = useSWR<{
    axis: string;
    history: AxisHistoryPoint[];
  }>(activeAxis ? `/api/axis/${activeAxis}/history?days=90` : null, fetcher, {
    revalidateOnFocus: false,
  });

  const { data: axisSourcesData } = useSWR<{
    axis: string;
    sources: AxisSourceEntry[];
  }>(activeAxis ? `/api/axis/${activeAxis}/sources?limit=20` : null, fetcher, {
    revalidateOnFocus: false,
  });

  const { data: sourceMapSourcesData } = useSWR<{
    axis: string;
    sources: AxisSourceEntry[];
  }>(
    showSourceMap && sourceMapAxis
      ? `/api/axis/${sourceMapAxis}/sources?limit=20`
      : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (dateFromUrl && availableDates.includes(dateFromUrl)) {
      setSelectedDate(dateFromUrl);
    }
  }, [dateFromUrl, availableDates, setSelectedDate]);

  useEffect(() => {
    if (axisFromUrl) setActiveAxis(axisFromUrl);
  }, [axisFromUrl, setActiveAxis]);

  const handleDateChange = useCallback(
    (date: string) => {
      setSelectedDate(date);
      const url = new URL(window.location.href);
      url.searchParams.set("date", date);
      window.history.replaceState({}, "", url.pathname + url.search);
    },
    [setSelectedDate],
  );

  const handleAxisClick = useCallback(
    (axis: string) => {
      setActiveAxis(axis);
      const url = new URL(window.location.href);
      url.searchParams.set("axis", axis);
      window.history.replaceState({}, "", url.pathname + url.search);
      document
        .getElementById(`axis-${axis}`)
        ?.scrollIntoView({ behavior: "smooth" });
    },
    [setActiveAxis],
  );

  const snapshot = snapshotData?.snapshot ?? null;
  const resolvedDate = snapshotData?.resolvedDate ?? effectiveDate;
  const isExact = snapshotData?.isExact ?? true;
  const historyForRadar = useMemo(() => {
    if (!effectiveDate || !historyData?.history) return [];
    const idx = historyData.history.findIndex((e) => e.date === effectiveDate);
    if (idx < 0) return historyData.history.slice(0, 3);
    return historyData.history.slice(idx, idx + 4).slice(0, 3);
  }, [effectiveDate, historyData?.history]);

  const handleViewSources = useCallback(
    (axis: string) => {
      setSourceMapAxis(axis);
      setActiveAxis(axis);
      setShowSourceMap(true);
    },
    [setActiveAxis],
  );

  const handleViewDetails = useCallback(
    (axis: string) => {
      setActiveAxis(axis);
      setModalOpen(true);
    },
    [setActiveAxis],
  );

  const axisSourcesForPanel = sourceMapSourcesData?.sources ?? [];
  const sourceCountByAxis = useMemo(() => {
    const out: Record<string, number> = {};
    if (activeAxis && axisSourcesData?.sources) {
      out[activeAxis] = axisSourcesData.sources.length;
    }
    if (sourceMapAxis && sourceMapSourcesData?.sources) {
      out[sourceMapAxis] = sourceMapSourcesData.sources.length;
    }
    return out;
  }, [
    activeAxis,
    axisSourcesData?.sources,
    sourceMapAxis,
    sourceMapSourcesData?.sources,
  ]);

  const AXIS_LABELS: Record<string, string> = {
    reasoning: "Reasoning",
    learning_efficiency: "Learning",
    long_term_memory: "Memory",
    planning: "Planning",
    tool_use: "Tool Use",
    social_cognition: "Social",
    multimodal_perception: "Multimodal",
    robustness: "Robustness",
    alignment_safety: "Alignment",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← Home
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            Capability Profile
          </h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-8">
        <section>
          <TimeScrubber
            availableDates={availableDates}
            selectedDate={effectiveDate}
            onDateChange={handleDateChange}
            resolvedDate={resolvedDate}
            isExact={isExact}
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <section className="flex justify-center">
              <CapabilityRadar
                snapshot={snapshot}
                history={historyForRadar}
                size={520}
                className="max-w-[60vw] w-full"
                selectedAxis={activeAxis}
                onAxisClick={handleAxisClick}
              />
            </section>

            {!isExact && resolvedDate && (
              <p className="text-sm text-muted-foreground text-center">
                No data for selected date. Showing nearest: {resolvedDate}.
              </p>
            )}

            <DomainBreakdown
              snapshot={snapshot}
              onViewSources={handleViewSources}
              onViewDetails={handleViewDetails}
              sourceCountByAxis={sourceCountByAxis}
            />

            {showSourceMap && sourceMapAxis && (
              <SourceMapPanel
                axis={sourceMapAxis}
                axisLabel={AXIS_LABELS[sourceMapAxis] ?? sourceMapAxis}
                sources={axisSourcesForPanel}
                onClose={() => setShowSourceMap(false)}
              />
            )}
          </div>

          <aside className="space-y-4">
            <FilterToggles />
          </aside>
        </div>
      </main>

      <AxisDetailModal
        axis={activeAxis}
        open={modalOpen}
        onOpenChange={setModalOpen}
        history={axisHistoryData?.history ?? []}
      />
    </div>
  );
}
