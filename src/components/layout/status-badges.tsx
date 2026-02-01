"use client";

import { Badge } from "@/components/ui/badge";

export function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

interface StatusBadgesProps {
  lastUpdate: string | null;
  sourceCount?: number;
  coveragePercent?: number | null;
  isStale?: boolean;
  /** Optional live indicator (dot). */
  showLiveIndicator?: boolean;
}

export function StatusBadges({
  lastUpdate,
  sourceCount = 0,
  coveragePercent = null,
  isStale = false,
  showLiveIndicator = false,
}: StatusBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {showLiveIndicator && (
        <span
          role="img"
          className={`h-2 w-2 rounded-full shrink-0 ${
            isStale ? "bg-amber-400 animate-pulse" : "bg-emerald-500"
          }`}
          aria-label={isStale ? "Data may be stale" : "Live"}
        />
      )}
      <Badge variant="secondary" className="font-mono text-xs">
        Updated {formatTimestamp(lastUpdate)}
      </Badge>
      {sourceCount > 0 && (
        <Badge variant="outline" className="font-mono text-xs">
          {sourceCount} sources
        </Badge>
      )}
      {coveragePercent != null && (
        <Badge variant="outline" className="font-mono text-xs">
          {(coveragePercent * 100).toFixed(0)}% coverage
        </Badge>
      )}
      {isStale && (
        <Badge variant="destructive" className="text-xs">
          Stale data
        </Badge>
      )}
    </div>
  );
}
