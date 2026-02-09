"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { TimelineEvent } from "@/lib/timeline/types";

/** Focus on recent events by default — span from 2020 to current year + 1. */
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 2020;
const MAX_YEAR = CURRENT_YEAR + 1;
const PX_PER_YEAR = 120; // More pixels per year for focused view
const LABEL_WIDTH = 120;
const LANE_HEIGHT = 36;
const MIN_LABEL_GAP = 8;
const DOT_ROW_HEIGHT = 14;
const LABEL_MAX_LEN = 28;

const CATEGORY_COLORS: Record<string, string> = {
  benchmark: "hsl(var(--chart-1))",
  model: "hsl(var(--chart-2))",
  policy: "hsl(var(--chart-3))",
  research: "hsl(var(--chart-4))",
};

/** Determine dot size based on significance field (1-5 scale). */
function getEventSize(event: TimelineEvent): number {
  const sig = event.significance ?? 1;
  if (sig >= 5) return 18;
  if (sig >= 4) return 16;
  if (sig >= 3) return 14;
  if (sig >= 2) return 12;
  return 10;
}

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

  const { positionedEvents, trackHeight } = useMemo(() => {
    const withX = events.map((e) => ({
      ...e,
      x: dateToX(e.date, PX_PER_YEAR),
      color: CATEGORY_COLORS[e.category] ?? "hsl(var(--primary))",
    }));
    withX.sort((a, b) => a.x - b.x);

    const laneEnds: number[] = [];
    let numLanes = 0;
    const withLanes = withX.map((e) => {
      const start = e.x - LABEL_WIDTH / 2;
      const end = e.x + LABEL_WIDTH / 2;
      let lane = 0;
      while (lane < laneEnds.length && laneEnds[lane] + MIN_LABEL_GAP > start) {
        lane += 1;
      }
      laneEnds[lane] = end;
      numLanes = Math.max(numLanes, lane + 1);
      return { ...e, lane };
    });

    const trackHeight = DOT_ROW_HEIGHT + numLanes * LANE_HEIGHT;
    return { positionedEvents: withLanes, trackHeight };
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
        className="overflow-auto scrollbar-thin"
        style={{ scrollbarWidth: "thin" }}
        aria-label="Timeline scroll"
      >
        <div
          style={{ width: contentWidth, minHeight: 32 + trackHeight }}
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

          {/* Event track: dot row + labels by lane */}
          <div
            className="absolute"
            style={{
              top: 32,
              left: 0,
              width: contentWidth,
              height: trackHeight,
            }}
          >
            {positionedEvents.map((e) => {
              const dotSize = getEventSize(e);
              const isMilestone = e.isMilestone;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onEventClick(e)}
                  className="absolute border-2 border-background transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background z-10"
                  style={{
                    left: e.x - dotSize / 2,
                    top: 1 + (14 - dotSize) / 2,
                    width: dotSize,
                    height: dotSize,
                    backgroundColor: e.color,
                    borderRadius: isMilestone ? "2px" : "50%",
                    transform: isMilestone ? "rotate(45deg)" : undefined,
                    boxShadow: isMilestone
                      ? `0 0 6px ${e.color}`
                      : undefined,
                  }}
                  title={`${isMilestone ? "★ " : ""}${formatDate(e.date)}: ${e.title}`}
                  aria-label={`${isMilestone ? "Milestone: " : ""}${e.title}, ${formatDate(e.date)}`}
                />
              );
            })}
            {positionedEvents.map((e) => (
              <div
                key={`label-${e.id}`}
                className={`absolute text-xs whitespace-nowrap pointer-events-none rounded border px-1.5 py-0.5 shadow-sm ${
                  e.isMilestone
                    ? "border-primary/40 bg-card text-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
                style={{
                  left: Math.max(0, e.x - LABEL_WIDTH / 2),
                  top: DOT_ROW_HEIGHT + e.lane * LANE_HEIGHT,
                  width: LABEL_WIDTH,
                  textAlign: "center",
                }}
              >
                <span className="block font-mono">{formatDate(e.date)}</span>
                <span className={`block font-medium truncate ${e.isMilestone ? "text-foreground" : "text-foreground"}`}>
                  {e.isMilestone ? "★ " : ""}{shortTitle(e.title)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mini-map: year strip */}
      <div className="flex gap-0.5 p-2 border-t border-border bg-muted/20">
        {Array.from({ length: MAX_YEAR - MIN_YEAR }, (_, i) => {
          const year = MIN_YEAR + i;
          const yearEvents = positionedEvents.filter(
            (e) => new Date(`${e.date}T00:00:00`).getFullYear() === year,
          );
          return (
            <button
              key={year}
              type="button"
              onClick={() => handleScrollToYear(year)}
              className="flex-1 h-3 rounded-sm transition-colors relative"
              style={{
                backgroundColor:
                  yearEvents.length > 0
                    ? `hsl(var(--chart-1) / ${Math.min(0.6, 0.15 + yearEvents.length * 0.08)})`
                    : "hsl(var(--muted))",
              }}
              title={`${year} (${yearEvents.length} events)`}
              aria-label={`Jump to ${year}`}
            >
              {yearEvents.length > 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-medium text-foreground/70">
                  {yearEvents.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
