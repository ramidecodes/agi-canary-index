"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import type { Canary } from "@/lib/home/types";
import { useHomeStore } from "@/lib/home/store";

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

interface CanaryStripProps {
  canaries: Canary[];
  className?: string;
}

export function CanaryStrip({ canaries, className = "" }: CanaryStripProps) {
  const { hoveredCanaryId, setHoveredCanaryId } = useHomeStore();
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

  return (
    <div
      className={`sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 border-y border-border ${className}`}
    >
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
        {canaries.map((canary) => {
          const colorClass = STATUS_COLORS[canary.status];
          const isHovered = hoveredCanaryId === canary.id;

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
                  <Link
                    href={`/autonomy?canary=${canary.id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background min-h-[44px] min-w-[44px] shrink-0 justify-center"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${colorClass}`}
                      aria-hidden
                    />
                    <span>{canary.name}</span>
                  </Link>
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
                        className={`h-2 w-2 shrink-0 rounded-full ${colorClass}`}
                      />
                      <span className="font-medium">{canary.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {canary.description}
                    </p>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {STATUS_LABELS[canary.status] && (
                        <p>Status: {STATUS_LABELS[canary.status]}</p>
                      )}
                      {canary.lastChange && (
                        <p>Last change: {canary.lastChange}</p>
                      )}
                      {canary.confidence != null && (
                        <p>
                          Confidence: {(canary.confidence * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
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
