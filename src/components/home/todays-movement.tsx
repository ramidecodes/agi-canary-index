"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Movement } from "@/lib/home/types";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface TodaysMovementProps {
  movements: Movement[];
  date: string;
  className?: string;
}

export function TodaysMovement({
  movements,
  date: _date,
  className = "",
}: TodaysMovementProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Today&apos;s Movement
        </CardTitle>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes recorded.</p>
        ) : (
          <ul className="space-y-2">
            {movements.map((m, i) => (
              <li
                key={`${m.axis}-${i}`}
                className="flex items-center gap-2 text-sm"
              >
                {m.direction === "up" && (
                  <ArrowUp
                    className="h-4 w-4 text-emerald-500 shrink-0"
                    aria-hidden
                  />
                )}
                {m.direction === "down" && (
                  <ArrowDown
                    className="h-4 w-4 text-red-500 shrink-0"
                    aria-hidden
                  />
                )}
                {m.direction === "neutral" && (
                  <Minus
                    className="h-4 w-4 text-muted-foreground shrink-0"
                    aria-hidden
                  />
                )}
                <span>
                  <span className="font-medium">{m.label}</span>{" "}
                  {m.direction !== "neutral" && (
                    <span className="text-muted-foreground">
                      {m.direction === "up" ? "+" : ""}
                      {(m.delta * 100).toFixed(1)}%
                    </span>
                  )}
                  {m.source && (
                    <span className="text-muted-foreground text-xs ml-1">
                      ({m.source})
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
