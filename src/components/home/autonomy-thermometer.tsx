"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const LEVELS = [
  {
    id: "non_agentic",
    label: "Non-agentic",
    color: "oklch(0.488 0.243 264.376)",
  },
  { id: "tool_using", label: "Tool-using", color: "oklch(0.696 0.17 162.48)" },
  {
    id: "long_horizon",
    label: "Long-horizon",
    color: "oklch(0.769 0.188 70.08)",
  },
  {
    id: "self_directed",
    label: "Self-directed",
    color: "oklch(0.704 0.191 22.216)",
  },
] as const;

interface AutonomyThermometerProps {
  /** 0-1 normalized autonomy level (derived from planning/tool_use axes or snapshot) */
  level?: number;
  className?: string;
}

export function AutonomyThermometer({
  level = 0.35,
  className = "",
}: AutonomyThermometerProps) {
  const normalized = Math.max(0, Math.min(1, level));
  const segmentHeight = 100 / LEVELS.length;

  return (
    <Card
      className={cn(
        "border-border/80 bg-card/80 dark:bg-card/70 backdrop-blur-sm shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset]",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Autonomy Level</CardTitle>
      </CardHeader>
      <CardContent>
        <Link
          href="/autonomy"
          className="block outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-lg -m-2 p-2"
          aria-label="View Autonomy & Risk details"
        >
          <div
            className="relative h-32 w-12 rounded-lg overflow-hidden border border-border"
            role="img"
            aria-label={`Autonomy level: ${Math.round(normalized * 100)}%`}
          >
            {/* Background gradient segments */}
            <div className="absolute inset-0 flex flex-col">
              {LEVELS.map((l) => (
                <div
                  key={l.id}
                  className="flex-1 transition-colors"
                  style={{
                    backgroundColor: `${l.color}20`,
                    minHeight: `${segmentHeight}%`,
                  }}
                />
              ))}
            </div>

            {/* Fill indicator */}
            <div
              className="absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out"
              style={{
                height: `${normalized * 100}%`,
                background: `linear-gradient(to top, ${LEVELS[0].color}40, ${
                  LEVELS[LEVELS.length - 1].color
                }60)`,
              }}
            />

            {/* Level markers */}
            <div className="absolute inset-0 flex flex-col justify-between py-1">
              {LEVELS.map((l) => (
                <div
                  key={l.id}
                  className="h-px w-full"
                  style={{ backgroundColor: `${l.color}50` }}
                />
              ))}
            </div>
          </div>

          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {LEVELS.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-2"
                style={{
                  fontFamily:
                    "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
                }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: l.color }}
                />
                {l.label}
              </div>
            ))}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
