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
      const entry = snapshot.axisScores[axis];
      const score = entry?.score != null ? Number(entry.score) : null;
      const uncertainty = entry?.uncertainty ?? 0.3;
      const delta = entry?.delta ?? 0;
      return {
        axis,
        label: AXIS_LABELS[axis] ?? axis,
        score,
        scorePct: score != null ? scoreToPct(score) : null,
        uncertainty,
        delta,
        sourceCount: sourceCountByAxis[axis] ?? 0,
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
                isActive ? "border-primary bg-muted/50" : "border-border"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium text-foreground">{row.label}</span>
                <div className="flex items-center gap-2">
                  {row.scorePct != null && (
                    <span className="text-sm text-muted-foreground">
                      {row.scorePct}%
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-xs font-medium",
                      row.delta > 0 && "text-green-600",
                      row.delta < 0 && "text-red-600"
                    )}
                  >
                    {deltaLabel}
                  </span>
                </div>
              </div>
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
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Uncertainty: ±{(row.uncertainty * 50).toFixed(0)}%</span>
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
