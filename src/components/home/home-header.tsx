"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface HomeHeaderProps {
  lastUpdate: string | null;
  sourceCount?: number;
  coveragePercent?: number | null;
  isStale?: boolean;
}

function formatTimestamp(iso: string | null): string {
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

export function HomeHeader({
  lastUpdate,
  sourceCount = 0,
  coveragePercent = null,
  isStale = false,
}: HomeHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            AGI CANARY WATCHER
            <span
              role="img"
              className={`h-2 w-2 rounded-full ${
                isStale ? "bg-amber-400 animate-pulse" : "bg-emerald-500"
              }`}
              aria-label={isStale ? "Data may be stale" : "Live"}
            />
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Epistemic instrumentation for AGI progress
          </p>
        </div>
        <Link
          href="/admin/sources"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Admin →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
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
    </header>
  );
}
