"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { TimelineEvent } from "@/lib/timeline/types";

const MIN_YEAR = 1950;
const MAX_YEAR = 2030;
const PX_PER_YEAR = 36;
const TRACK_HEIGHT = 80;
const LABEL_MAX_LEN = 28;

const CATEGORY_COLORS: Record<string, string> = {
  benchmark: "hsl(var(--chart-1))",
  model: "hsl(var(--chart-2))",
  policy: "hsl(var(--chart-3))",
  research: "hsl(var(--chart-4))",
};

function dateToX(dateStr: string, pxPerYear: number): number {
  const d = new Date(`${dateStr}T00:00:00`);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const frac = (month * 30 + day) / 365;
  return (year - MIN_YEAR + frac) * pxPerYear;
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function shortTitle(title: string, maxLen = LABEL_MAX_LEN): string {
  if (title.length <= maxLen) return title;
  return `${title.slice(0, maxLen - 1)}…`;
}

export interface TimelineVisualizationProps {
  events: TimelineEvent[];
  onEventClick: (event: TimelineEvent) => void;
  scrollToYear?: number | null;
}

export function TimelineVisualization({
  events,
  onEventClick,
  scrollToYear,
}: TimelineVisualizationProps) {
  const scrollRef = useRef<HTMLElement>(null);
  const contentWidth = (MAX_YEAR - MIN_YEAR) * PX_PER_YEAR;

  const positionedEvents = useMemo(() => {
    const withX = events.map((e) => ({
      ...e,
      x: dateToX(e.date, PX_PER_YEAR),
      color: CATEGORY_COLORS[e.category] ?? "hsl(var(--primary))",
    }));
    withX.sort((a, b) => a.x - b.x);
    return withX.map((e, i) => ({
      ...e,
      labelAbove: i % 2 === 1,
    }));
  }, [events]);

  const handleScrollToYear = useCallback((year: number) => {
    const x = (year - MIN_YEAR) * PX_PER_YEAR;
    scrollRef.current?.scrollTo({
      left: Math.max(0, x - 100),
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (scrollToYear != null) {
      handleScrollToYear(scrollToYear);
    }
  }, [scrollToYear, handleScrollToYear]);

  const yearTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let y = MIN_YEAR; y <= MAX_YEAR; y += 5) {
      ticks.push(y);
    }
    return ticks;
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border bg-card">
      <section
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden scrollbar-thin"
        style={{ scrollbarWidth: "thin" }}
        aria-label="Timeline scroll"
      >
        <div
          style={{ width: contentWidth, minHeight: 32 + TRACK_HEIGHT }}
          className="relative"
        >
          {/* Year axis */}
          <div
            className="absolute top-0 left-0 right-0 h-8 flex items-center border-b border-border bg-muted/30"
            style={{ width: contentWidth }}
          >
            {yearTicks.map((year) => (
              <div
                key={year}
                className="absolute font-mono text-xs text-muted-foreground"
                style={{ left: (year - MIN_YEAR) * PX_PER_YEAR + 4 }}
              >
                {year}
              </div>
            ))}
          </div>

          {/* Grid lines */}
          {yearTicks.map((year) => (
            <div
              key={`grid-${year}`}
              className="absolute top-8 bottom-0 w-px bg-border/50"
              style={{ left: (year - MIN_YEAR) * PX_PER_YEAR }}
            />
          ))}

          {/* Event track: labels (staggered) + dots */}
          <div
            className="absolute"
            style={{
              top: 32,
              left: 0,
              width: contentWidth,
              height: TRACK_HEIGHT,
            }}
          >
            {positionedEvents.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onEventClick(e)}
                className="absolute rounded-full border-2 border-background transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                style={{
                  left: e.x - 6,
                  top: 26,
                  width: 12,
                  height: 12,
                  backgroundColor: e.color,
                }}
                title={`${formatDate(e.date)}: ${e.title}`}
                aria-label={`${e.title}, ${formatDate(e.date)}`}
              />
            ))}
            {/* Labels above track */}
            {positionedEvents
              .filter((e) => e.labelAbove)
              .map((e) => (
                <div
                  key={`above-${e.id}`}
                  className="absolute text-xs text-muted-foreground whitespace-nowrap pointer-events-none"
                  style={{
                    left: Math.max(0, e.x - 60),
                    top: 0,
                    width: 120,
                    textAlign: "center",
                  }}
                >
                  <span className="block font-mono">{formatDate(e.date)}</span>
                  <span className="block font-medium text-foreground truncate">
                    {shortTitle(e.title)}
                  </span>
                </div>
              ))}
            {/* Labels below track */}
            {positionedEvents
              .filter((e) => !e.labelAbove)
              .map((e) => (
                <div
                  key={`below-${e.id}`}
                  className="absolute text-xs text-muted-foreground whitespace-nowrap pointer-events-none"
                  style={{
                    left: Math.max(0, e.x - 60),
                    top: 44,
                    width: 120,
                    textAlign: "center",
                  }}
                >
                  <span className="block font-mono">{formatDate(e.date)}</span>
                  <span className="block font-medium text-foreground truncate">
                    {shortTitle(e.title)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Mini-map: decade strip */}
      <div className="flex gap-0.5 p-2 border-t border-border bg-muted/20">
        {Array.from({ length: 8 }, (_, i) => {
          const year = MIN_YEAR + i * 10;
          return (
            <button
              key={year}
              type="button"
              onClick={() => handleScrollToYear(year)}
              className="flex-1 h-2 rounded-sm bg-muted hover:bg-muted-foreground/30 transition-colors"
              title={`${year}s`}
              aria-label={`Jump to ${year}s`}
            />
          );
        })}
      </div>
    </div>
  );
}
