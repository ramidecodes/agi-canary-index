"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Canary } from "@/lib/home/types";
import { useHomeStore } from "@/lib/home/store";
import { formatTimestamp } from "@/components/layout/status-badges";
import { X } from "lucide-react";

const HOVER_DELAY_MS = 150;

const STATUS_COLORS = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
  gray: "bg-muted-foreground/40",
} as const;

const STATUS_LABELS = {
  green: "On track",
  yellow: "Watchful",
  red: "Concerning",
  gray: "No data",
} as const;

const chipBaseClass =
  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 min-h-[44px] shrink-0 justify-center border-border/80 bg-card/80 text-muted-foreground";

export interface StripStatus {
  lastUpdate: string | null;
  sourceCount: number;
  coveragePercent?: number | null;
  isStale?: boolean;
}

interface CanaryStripProps {
  canaries: Canary[];
  /** When provided, status pills (Updated, N sources) are shown at the start of the strip. */
  status?: StripStatus | null;
  className?: string;
}

export function CanaryStrip({
  canaries,
  status,
  className = "",
}: CanaryStripProps) {
  const {
    hoveredCanaryId,
    setHoveredCanaryId,
    activeCanaryFilter,
    setCanaryFilter,
  } = useHomeStore();
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = (id: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setHoveredCanaryId(id);
  };

  const handleLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredCanaryId(null);
      closeTimeoutRef.current = null;
    }, HOVER_DELAY_MS);
  };

  const handleCanaryClick = (e: React.MouseEvent, canaryId: string) => {
    e.preventDefault();
    setCanaryFilter(activeCanaryFilter === canaryId ? null : canaryId);
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/80 dark:bg-background/70 backdrop-blur-md border-y border-border/80 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset]",
        className,
      )}
      role="toolbar"
      aria-label="Canary filters and status"
    >
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
        {status != null && (
          <>
            {/* biome-ignore lint/a11y/useSemanticElements: live status region, not form output */}
            <span
              className={cn(
                chipBaseClass,
                "font-mono text-xs",
                status.isStale &&
                  "border-amber-500/40 text-amber-600 dark:text-amber-400",
              )}
              role="status"
              aria-live="polite"
            >
              <span
                role="img"
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  status.isStale
                    ? "bg-amber-400 animate-pulse"
                    : "bg-emerald-500",
                )}
                aria-label={status.isStale ? "Data may be stale" : "Live"}
              />
              Updated {formatTimestamp(status.lastUpdate)}
            </span>
            {status.sourceCount > 0 && (
              <span className={cn(chipBaseClass, "font-mono text-xs")}>
                {status.sourceCount} sources
              </span>
            )}
            {status.coveragePercent != null && (
              <span className={cn(chipBaseClass, "font-mono text-xs")}>
                {(status.coveragePercent * 100).toFixed(0)}% coverage
              </span>
            )}
            {canaries.length > 0 && (
              <span
                className="h-4 w-px bg-border shrink-0 mx-0.5"
                aria-hidden
              />
            )}
          </>
        )}
        {activeCanaryFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setCanaryFilter(null)}
            aria-label="Clear filter"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
        {canaries.map((canary) => {
          const colorClass = STATUS_COLORS[canary.status];
          const isHovered = hoveredCanaryId === canary.id;
          const isActive = activeCanaryFilter === canary.id;

          return (
            <Popover key={canary.id} open={isHovered}>
              {/* biome-ignore lint/a11y/useSemanticElements: div needed for hover area; role=group provides grouping */}
              <div
                role="group"
                aria-label={`Canary ${canary.name}`}
                className="inline-flex"
                onMouseEnter={() => handleEnter(canary.id)}
                onMouseLeave={handleLeave}
              >
                <PopoverAnchor asChild>
                  <button
                    type="button"
                    onClick={(e) => handleCanaryClick(e, canary.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 min-h-[44px] shrink-0 justify-center",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                      isActive
                        ? "border-primary/80 bg-primary/20 text-foreground ring-1 ring-primary/30"
                        : "border-border/80 bg-card/80 text-muted-foreground hover:bg-accent/90 hover:text-foreground hover:border-muted-foreground/40",
                    )}
                    aria-pressed={isActive}
                    aria-label={`Filter by ${canary.name}${
                      isActive ? ", active" : ""
                    }`}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        colorClass,
                      )}
                      aria-hidden
                    />
                    <span>{canary.name}</span>
                  </button>
                </PopoverAnchor>
                <PopoverContent
                  side="bottom"
                  align="center"
                  sideOffset={8}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                  onMouseEnter={() => handleEnter(canary.id)}
                  onMouseLeave={handleLeave}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          colorClass,
                        )}
                      />
                      <span className="font-medium">{canary.name}</span>
                      <span
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full border",
                          canary.status === "green" &&
                            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                          canary.status === "yellow" &&
                            "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
                          canary.status === "red" &&
                            "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
                          canary.status === "gray" &&
                            "bg-muted text-muted-foreground border-border",
                        )}
                      >
                        {STATUS_LABELS[canary.status]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {canary.description}
                    </p>
                    {/* Status reason from computed canary data */}
                    {(canary as { reason?: string }).reason && (
                      <p className="text-xs text-foreground/70 bg-muted/50 rounded px-2 py-1">
                        {(canary as { reason?: string }).reason}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {canary.lastChange && (
                        <p>
                          Last change: {canary.lastChange}
                          {(() => {
                            if (!canary.lastChange) return "";
                            const daysAgo = Math.floor(
                              (Date.now() -
                                new Date(`${canary.lastChange}T12:00:00`).getTime()) /
                                (1000 * 60 * 60 * 24),
                            );
                            if (daysAgo === 0) return " (today)";
                            if (daysAgo === 1) return " (yesterday)";
                            return ` (${daysAgo} days ago)`;
                          })()}
                        </p>
                      )}
                      {canary.confidence != null && (
                        <p>
                          Confidence: {(canary.confidence * 100).toFixed(0)}%
                        </p>
                      )}
                      {/* Score vs threshold indication */}
                      {canary.thresholds &&
                        Object.keys(canary.thresholds).length > 0 && (
                          <div className="flex gap-2 mt-1">
                            {Object.entries(canary.thresholds).map(
                              ([level, threshold]) => (
                                <span
                                  key={level}
                                  className={cn(
                                    "text-[10px] px-1 py-0.5 rounded border",
                                    canary.status === level
                                      ? "border-foreground/30 font-medium"
                                      : "border-border/50 opacity-60",
                                  )}
                                >
                                  {level}: {String(threshold)}
                                </span>
                              ),
                            )}
                          </div>
                        )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="mt-2"
                    >
                      <Link href={`/autonomy?canary=${canary.id}`}>
                        View details →
                      </Link>
                    </Button>
                  </div>
                </PopoverContent>
              </div>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}
