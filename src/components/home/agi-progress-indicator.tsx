"use client";

import useSWR from "swr";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus, TrendingUp } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Zone labels for the composite gauge. */
const ZONES = [
  {
    min: 0,
    max: 25,
    label: "Narrow AI",
    color: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  },
  {
    min: 25,
    max: 50,
    label: "Emerging Capabilities",
    color: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
  },
  {
    min: 50,
    max: 75,
    label: "Broad Competence",
    color: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  },
  {
    min: 75,
    max: 100,
    label: "AGI-Level",
    color: "bg-red-500/20 text-red-600 dark:text-red-400",
  },
];

function getZone(score: number) {
  return ZONES.find((z) => score >= z.min && score < z.max) ?? ZONES[0];
}

function TrendIcon({ delta }: { delta: number }) {
  if (delta > 1)
    return <ArrowUp className="h-3.5 w-3.5 text-emerald-500" aria-hidden />;
  if (delta < -1)
    return <ArrowDown className="h-3.5 w-3.5 text-red-500" aria-hidden />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />;
}

interface AGIProgressIndicatorProps {
  className?: string;
}

export function AGIProgressIndicator({
  className = "",
}: AGIProgressIndicatorProps) {
  const { data, error } = useSWR<{
    compositeScore: number;
    trend: string;
    weekOverWeekDelta: number;
    topMovers: Array<{ axis: string; delta: number; label?: string }>;
    gapAxes: string[];
  }>("/api/composite", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  });

  if (error || !data) {
    return null;
  }

  const { compositeScore, weekOverWeekDelta } = data;
  const zone = getZone(compositeScore);
  const fillWidth = Math.max(2, Math.min(100, compositeScore));

  return (
    <div
      className={cn("w-full max-w-md mx-auto", className)}
      role="img"
      aria-label={`AGI Progress: ${compositeScore.toFixed(1)}% — ${zone.label}`}
    >
      {/* Score and trend */}
      <div className="flex items-center justify-center gap-3 mb-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span
            className="text-2xl font-bold tabular-nums tracking-tight"
            style={{
              fontFamily:
                "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
            }}
          >
            {compositeScore.toFixed(1)}%
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border",
            zone.color,
          )}
        >
          {zone.label}
        </span>
        {weekOverWeekDelta !== 0 && (
          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
            <TrendIcon delta={weekOverWeekDelta} />
            {weekOverWeekDelta > 0 ? "+" : ""}
            {weekOverWeekDelta.toFixed(1)}% / wk
          </span>
        )}
      </div>

      {/* Gauge bar */}
      <div className="relative h-2.5 w-full rounded-full overflow-hidden bg-muted/50">
        {/* Zone background segments */}
        <div className="absolute inset-0 flex">
          {ZONES.map((z) => (
            <div
              key={z.label}
              className="h-full border-r border-background/40 last:border-r-0"
              style={{ width: `${z.max - z.min}%` }}
            />
          ))}
        </div>
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${fillWidth}%`,
            background:
              "linear-gradient(90deg, oklch(0.58 0.22 264 / 0.6), oklch(0.58 0.22 264 / 0.9))",
          }}
        />
        {/* Zone markers */}
        {[25, 50, 75].map((pct) => (
          <div
            key={pct}
            className="absolute top-0 bottom-0 w-px bg-border/60"
            style={{ left: `${pct}%` }}
          />
        ))}
      </div>

      {/* Zone labels */}
      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground/70">
        {ZONES.map((z) => (
          <span key={z.label} className="text-center" style={{ width: "25%" }}>
            {z.label}
          </span>
        ))}
      </div>
    </div>
  );
}
