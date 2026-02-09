"use client";

import { AXES } from "@/lib/signal/schemas";
import { CapabilityRadar, AXIS_LABELS } from "./capability-radar";
import { AGIProgressIndicator } from "./agi-progress-indicator";
import { useHomeStore } from "@/lib/home/store";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Snapshot, SnapshotHistoryEntry } from "@/lib/home/types";

/** Minimum signal count for axis to be considered "backed". */
const MIN_SIGNAL_BACKING = 3;

const MONO_FONT =
  "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace";

function TrendDot({ delta, isLowData }: { delta: number; isLowData: boolean }) {
  if (isLowData) {
    return (
      <Minus
        className="h-3 w-3 text-muted-foreground/50 shrink-0"
        aria-hidden
      />
    );
  }
  if (delta > 0.02) {
    return (
      <ArrowUp className="h-3 w-3 text-emerald-500 shrink-0" aria-hidden />
    );
  }
  if (delta < -0.02) {
    return <ArrowDown className="h-3 w-3 text-red-500 shrink-0" aria-hidden />;
  }
  return (
    <Minus className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden />
  );
}

/** Format a delta as a human-readable string like "+0.05" or "−0.12". */
function formatDelta(delta: number): string {
  const abs = Math.abs(delta);
  if (abs < 0.005) return "";
  const sign = delta > 0 ? "+" : "\u2212";
  return `${sign}${abs.toFixed(2)}`;
}

/** Map raw score (−1…+1) to a 0–100% bar width. */
function scoreToPercent(score: number): number {
  return Math.max(0, Math.min(100, ((score + 1) / 2) * 100));
}

function AxisReadout({ snapshot }: { snapshot: Snapshot | null }) {
  const selectedRadarAxis = useHomeStore((s) => s.selectedRadarAxis);
  const setSelectedRadarAxis = useHomeStore((s) => s.setSelectedRadarAxis);

  return (
    <ul className="space-y-0.5" aria-label="Axis scores">
      {AXES.map((axis) => {
        const entry = snapshot?.axisScores?.[axis] as
          | { score?: number; delta?: number; signalCount?: number }
          | undefined;
        const score = entry?.score;
        const delta = entry?.delta ?? 0;
        const isLowData = (entry?.signalCount ?? 0) < MIN_SIGNAL_BACKING;
        const isSelected = selectedRadarAxis === axis;
        const label = AXIS_LABELS[axis] ?? axis;
        const hasScore = score != null;
        const deltaStr = hasScore ? formatDelta(delta) : "";

        return (
          <li
            key={axis}
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors cursor-default text-sm",
              "hover:bg-muted/40",
              isSelected && "bg-muted/50",
            )}
            onMouseEnter={() => setSelectedRadarAxis(axis)}
            onMouseLeave={() => setSelectedRadarAxis(null)}
          >
            <TrendDot delta={delta} isLowData={isLowData} />
            <span
              className={cn(
                "truncate font-medium min-w-0",
                isLowData ? "text-muted-foreground" : "text-foreground/90",
              )}
            >
              {label}
            </span>
            {/* Inline score bar */}
            <div className="flex-1 h-1 rounded-full bg-muted/30 overflow-hidden mx-1">
              {hasScore && (
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 ease-out",
                    isLowData && "opacity-40",
                  )}
                  style={{
                    width: `${scoreToPercent(score)}%`,
                    background:
                      "linear-gradient(90deg, oklch(0.58 0.22 264 / 0.5), oklch(0.58 0.22 264 / 0.85))",
                  }}
                />
              )}
            </div>
            <span
              className={cn(
                "tabular-nums text-xs shrink-0",
                isLowData ? "text-muted-foreground/50" : "text-foreground/80",
              )}
              style={{ fontFamily: MONO_FONT }}
            >
              {hasScore ? score.toFixed(2) : "\u2014"}
            </span>
            <span
              className={cn(
                "tabular-nums text-[11px] w-12 text-right shrink-0",
                !deltaStr
                  ? "text-muted-foreground/30"
                  : delta > 0.02
                    ? "text-emerald-500"
                    : delta < -0.02
                      ? "text-red-400"
                      : "text-muted-foreground/50",
              )}
              style={{ fontFamily: MONO_FONT }}
            >
              {deltaStr || "\u2014"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

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
  return (
    <section
      className="relative rounded-xl border border-border/80 bg-card/60 dark:bg-card/50 backdrop-blur-md py-8 sm:py-10 px-4 sm:px-6 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset]"
      aria-label="Capability radar overview"
    >
      {/* Gradient overlays */}
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

      <div className="relative max-w-5xl mx-auto">
        {/* Two-column layout: radar left, readout right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-6 lg:gap-10 items-center">
          {/* Left: Radar chart */}
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

          {/* Right: Score + axis readout */}
          <div className="space-y-5">
            <AGIProgressIndicator />

            <div className="border-t border-border/50 pt-4">
              <h3
                className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-2 px-2"
                style={{
                  fontFamily:
                    "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
                }}
              >
                Axes
              </h3>
              {isLoading && !snapshot ? (
                <div className="space-y-1.5 px-2">
                  {AXES.map((axis) => (
                    <div
                      key={`skel-${axis}`}
                      className="h-7 bg-muted/20 rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <AxisReadout snapshot={snapshot} />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
