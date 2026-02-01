"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";

export interface TimeNavigationProps {
  onJump: (year: number) => void;
}

const QUICK_JUMP_YEARS = [2020, 2022, 2024] as const;

function getTodayYear(): number {
  return new Date().getFullYear();
}

export function TimeNavigation({ onJump }: TimeNavigationProps) {
  const handleJump = useCallback(
    (year: number) => () => onJump(year),
    [onJump],
  );

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-muted-foreground mr-2">Jump to:</span>
      {QUICK_JUMP_YEARS.map((year) => (
        <Button
          key={year}
          variant="outline"
          size="sm"
          onClick={handleJump(year)}
          aria-label={`Jump to year ${year}`}
        >
          {year}
        </Button>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={handleJump(getTodayYear())}
        aria-label="Jump to today"
      >
        Today
      </Button>
    </div>
  );
}
