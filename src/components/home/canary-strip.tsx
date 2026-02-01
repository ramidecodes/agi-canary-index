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

interface CanaryStripProps {
  canaries: Canary[];
  className?: string;
}

export function CanaryStrip({ canaries, className = "" }: CanaryStripProps) {
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
        "sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 border-y border-border",
        className,
      )}
      role="toolbar"
      aria-label="Canary filters"
    >
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
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
                        ? "border-primary bg-primary/15 text-foreground scale-[1.02]"
                        : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground hover:border-muted-foreground/30",
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
