"use client";

import { useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface TimeScrubberProps {
  availableDates: string[];
  selectedDate: string | null;
  onDateChange: (date: string) => void;
  resolvedDate?: string | null;
  isExact?: boolean;
  className?: string;
}

function formatDateLabel(d: string): string {
  const date = new Date(`${d}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysAgo(d: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const a = new Date(`${d}T12:00:00`).getTime();
  const b = new Date(`${today}T12:00:00`).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function TimeScrubber({
  availableDates,
  selectedDate,
  onDateChange,
  resolvedDate,
  isExact = true,
  className = "",
}: TimeScrubberProps) {
  const index =
    selectedDate && availableDates.length > 0
      ? availableDates.indexOf(selectedDate)
      : availableDates.length - 1;
  const safeIndex = index >= 0 ? index : availableDates.length - 1;
  const value = Math.max(0, Math.min(safeIndex, availableDates.length - 1));
  const displayDate =
    resolvedDate ?? selectedDate ?? availableDates[availableDates.length - 1];
  const daysAgoLabel =
    displayDate != null
      ? daysAgo(displayDate) === 0
        ? "Today"
        : daysAgo(displayDate) === 1
          ? "1 day ago"
          : `${daysAgo(displayDate)} days ago`
      : "";

  const handleSliderChange = useCallback(
    (vals: number[]) => {
      const i = vals[0];
      const date =
        i >= 0 && i < availableDates.length ? availableDates[i] : null;
      if (date) onDateChange(date);
    },
    [availableDates, onDateChange],
  );

  const handlePreset = useCallback(
    (preset: "today" | "1m" | "3m" | "1y") => {
      if (availableDates.length === 0) return;
      const today = new Date().toISOString().slice(0, 10);
      if (preset === "today") {
        const idx = availableDates.indexOf(today);
        const date =
          idx >= 0
            ? availableDates[idx]
            : availableDates[availableDates.length - 1];
        if (date) onDateChange(date);
        return;
      }
      const target = new Date();
      if (preset === "1m") target.setMonth(target.getMonth() - 1);
      else if (preset === "3m") target.setMonth(target.getMonth() - 3);
      else if (preset === "1y") target.setFullYear(target.getFullYear() - 1);
      const closest = availableDates.reduce((prev, curr) =>
        Math.abs(new Date(curr).getTime() - target.getTime()) <
        Math.abs(new Date(prev).getTime() - target.getTime())
          ? curr
          : prev,
      );
      onDateChange(closest);
    },
    [availableDates, onDateChange],
  );

  if (availableDates.length === 0) {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground">
          No snapshot data available.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <div className="text-sm">
          <span className="font-medium text-foreground">
            {displayDate ? formatDateLabel(displayDate) : "—"}
          </span>
          {!isExact && displayDate && (
            <span className="ml-2 text-muted-foreground text-xs">
              (nearest available)
            </span>
          )}
          {daysAgoLabel && (
            <span className="ml-2 text-muted-foreground">· {daysAgoLabel}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePreset("today")}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePreset("1m")}
          >
            1 month ago
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePreset("3m")}
          >
            3 months ago
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePreset("1y")}
          >
            1 year ago
          </Button>
        </div>
      </div>
      <Slider
        min={0}
        max={Math.max(0, availableDates.length - 1)}
        step={1}
        value={[value]}
        onValueChange={handleSliderChange}
        aria-label="Select date for capability profile"
      />
    </div>
  );
}
