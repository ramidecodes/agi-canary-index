"use client";

import useSWR from "swr";
import { CapabilityRadar } from "./capability-radar";
import { AGIProgressIndicator } from "./agi-progress-indicator";
import type { Snapshot, SnapshotHistoryEntry } from "@/lib/home/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface HeroSectionProps {
  snapshot: Snapshot | null;
  history: SnapshotHistoryEntry[];
  radarSize: number;
  showGhosts: boolean;
  /** Axis keys to highlight (e.g. from active canary filter). */
  highlightAxes?: string[];
  /** Data is still loading from the API. */
  isLoading?: boolean;
}

export function HeroSection({
  snapshot,
  history,
  radarSize,
  showGhosts,
  highlightAxes,
  isLoading = false,
}: HeroSectionProps) {
  const { data: narrative } = useSWR<{
    headline: string;
    summaryLine: string;
  }>("/api/narrative", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  });

  return (
    <section
      className="relative rounded-xl border border-border/80 bg-card/60 dark:bg-card/50 backdrop-blur-md py-8 sm:py-12 md:py-14 px-4 sm:px-6 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset]"
      aria-label="Capability radar overview"
    >
      {/* Gradient overlay — clearly visible for control-room feel */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.12] dark:opacity-[0.28]"
        style={{
          background:
            "radial-gradient(ellipse 85% 55% at 50% 0%, var(--canary-accent), transparent 65%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08] dark:opacity-[0.22]"
        style={{
          background:
            "radial-gradient(ellipse 65% 45% at 50% 45%, var(--chart-1), transparent 55%)",
        }}
      />

      <div className="relative max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Narrative headline (title is in the navbar) */}
        <div className="text-center">
          {isLoading && !narrative?.headline ? (
            <div className="h-5 w-2/3 max-w-sm mx-auto bg-muted/30 rounded animate-pulse" />
          ) : narrative?.headline ? (
            <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
              {narrative.headline}
            </p>
          ) : null}
        </div>

        {/* AGI Progress Indicator — composite score gauge */}
        <AGIProgressIndicator className="pb-2" />

        <div className="flex justify-center">
          <div className="transition-opacity duration-500 ease-out">
            <CapabilityRadar
              snapshot={snapshot}
              history={showGhosts ? history : []}
              size={radarSize}
              highlightAxes={highlightAxes}
              isLoading={isLoading}
              className="drop-shadow-[0_0_24px_rgba(78,161,255,0.08)]"
            />
          </div>
        </div>

        {/* Summary line below radar */}
        {narrative?.summaryLine && (
          <p
            className="text-center text-xs text-muted-foreground/80"
            style={{
              fontFamily:
                "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
            }}
          >
            {narrative.summaryLine}
          </p>
        )}
      </div>
    </section>
  );
}
