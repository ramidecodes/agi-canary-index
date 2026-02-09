"use client";

import { useMemo } from "react";
import { AXES } from "@/lib/signal/schemas";
import type { Snapshot } from "@/lib/home/types";
import { useCapabilityProfileStore } from "@/lib/capabilities/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

function scoreToPct(score: number): number {
  return Math.round(((score + 1) / 2) * 100);
}

interface DomainBreakdownProps {
  snapshot: Snapshot | null;
  onViewSources: (axis: string) => void;
  onViewDetails: (axis: string) => void;
  sourceCountByAxis?: Record<string, number>;
  className?: string;
}

export function DomainBreakdown({
  snapshot,
  onViewSources,
  onViewDetails,
  sourceCountByAxis = {},
  className = "",
}: DomainBreakdownProps) {
  const { sortBy, setSortBy, activeAxis } = useCapabilityProfileStore();

  const rows = useMemo(() => {
    if (!snapshot?.axisScores) return [];
    const entries = AXES.map((axis) => {
      const entry = snapshot.axisScores[axis] as {
        score?: number;
        uncertainty?: number;
        delta?: number;
        signalCount?: number;
      } | undefined;
      const score = entry?.score != null ? Number(entry.score) : null;
      const uncertainty = entry?.uncertainty ?? 0.3;
      const delta = entry?.delta ?? 0;
      const signalCount = entry?.signalCount ?? sourceCountByAxis[axis] ?? 0;
      // Determine if this axis has actual signal backing
      const hasData = signalCount > 0 || (score != null && Math.abs(score) > 0.01);
      return {
        axis,
        label: AXIS_LABELS[axis] ?? axis,
        score,
        scorePct: hasData && score != null ? scoreToPct(score) : null,
        uncertainty,
        delta,
        sourceCount: sourceCountByAxis[axis] ?? 0,
        signalCount,
        hasData,
      };
    });

    if (sortBy === "alphabetical") {
      return [...entries].sort((a, b) => a.label.localeCompare(b.label));
    }
    if (sortBy === "score") {
      return [...entries].sort((a, b) => {
        const sa = a.score ?? -2;
        const sb = b.score ?? -2;
        return sb - sa;
      });
    }
    if (sortBy === "recentChange") {
      return [...entries].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    }
    return entries;
  }, [snapshot?.axisScores, sortBy, sourceCountByAxis]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Domain breakdown</CardTitle>
        <Select
          value={sortBy}
          onValueChange={(v) =>
            setSortBy(v as "alphabetical" | "score" | "recentChange")
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alphabetical">Alphabetical</SelectItem>
            <SelectItem value="score">By score</SelectItem>
            <SelectItem value="recentChange">By recent change</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => {
          const isActive = activeAxis === row.axis;
          const deltaLabel =
            row.delta > 0
              ? `+${row.delta.toFixed(2)} ↑`
              : row.delta < 0
                ? `${row.delta.toFixed(2)} ↓`
                : "→";
          return (
            <div
              key={row.axis}
              id={`axis-${row.axis}`}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                isActive ? "border-primary bg-muted/50" : "border-border",
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{row.label}</span>
                  {/* Signal count badge */}
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      row.hasData
                        ? "bg-muted text-muted-foreground"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    )}
                    style={{
                      fontFamily:
                        "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
                    }}
                  >
                    {row.hasData
                      ? `${row.signalCount} signal${row.signalCount !== 1 ? "s" : ""}`
                      : "No signals"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {row.hasData && row.scorePct != null ? (
                    <span className="text-sm text-muted-foreground">
                      {row.scorePct}%
                    </span>
                  ) : !row.hasData ? (
                    <span className="text-xs text-muted-foreground/60 italic">
                      No data
                    </span>
                  ) : null}
                  {row.hasData && (
                    <span
                      className={cn(
                        "text-xs font-medium",
                        row.delta > 0 && "text-green-600",
                        row.delta < 0 && "text-red-600",
                      )}
                    >
                      {deltaLabel}
                    </span>
                  )}
                </div>
              </div>
              {/* Progress bar: striped gray for "no data", normal for real scores */}
              {row.hasData ? (
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{
                      width: `${row.scorePct ?? 0}%`,
                      minWidth:
                        row.scorePct != null && row.scorePct > 0 ? "4px" : "0",
                    }}
                  />
                </div>
              ) : (
                <div
                  className="h-2 w-full rounded-full overflow-hidden mb-2"
                  role="img"
                  style={{
                    background:
                      "repeating-linear-gradient(45deg, hsl(var(--muted)), hsl(var(--muted)) 4px, transparent 4px, transparent 8px)",
                  }}
                  aria-label="No data available"
                />
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {/* Qualitative uncertainty labels instead of raw percentage */}
                <span>
                  {!row.hasData
                    ? "Insufficient data"
                    : row.uncertainty <= 0.15
                      ? "High confidence"
                      : row.uncertainty <= 0.3
                        ? "Moderate confidence"
                        : row.uncertainty <= 0.4
                          ? "Low confidence"
                          : "Very uncertain"}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => onViewSources(row.axis)}
                  >
                    {row.sourceCount > 0
                      ? `Based on ${row.sourceCount} source${
                          row.sourceCount !== 1 ? "s" : ""
                        }`
                      : "View sources"}
                  </button>
                  <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => onViewDetails(row.axis)}
                  >
                    View details
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
