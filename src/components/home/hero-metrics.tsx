"use client";

import { Badge } from "@/components/ui/badge";
import { formatTimestamp } from "@/components/layout/status-badges";

interface HeroMetricsProps {
  lastUpdate: string | null;
  sourceCount?: number;
  coveragePercent?: number | null;
  isStale?: boolean;
  className?: string;
}

export function HeroMetrics({
  lastUpdate,
  sourceCount = 0,
  coveragePercent = null,
  isStale = false,
  className = "",
}: HeroMetricsProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: status is a live region for metrics, not form output
    <div
      className={`flex flex-wrap gap-2 sm:gap-3 items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        role="img"
        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
          isStale ? "bg-amber-400 animate-pulse" : "bg-emerald-500"
        }`}
        aria-label={isStale ? "Data may be stale" : "Live"}
      />
      <Badge
        variant="secondary"
        className="font-mono text-xs sm:text-sm px-3 py-1"
      >
        Updated {formatTimestamp(lastUpdate)}
      </Badge>
      {sourceCount > 0 && (
        <Badge
          variant="outline"
          className="font-mono text-xs sm:text-sm px-3 py-1"
        >
          {sourceCount} sources
        </Badge>
      )}
      {coveragePercent != null && (
        <Badge
          variant="outline"
          className="font-mono text-xs sm:text-sm px-3 py-1"
        >
          {(coveragePercent * 100).toFixed(0)}% coverage
        </Badge>
      )}
      {isStale && (
        <Badge variant="destructive" className="text-xs sm:text-sm px-3 py-1">
          Stale data
        </Badge>
      )}
    </div>
  );
}
