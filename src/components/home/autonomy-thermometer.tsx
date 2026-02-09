"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** 5-level scale matching /api/autonomy/current and autonomy-gauge. @see docs/features/17-home-autonomy-level-component.md */
const LEVELS = [
  { id: 0, short: "L0", label: "Tool-only", color: "oklch(0.696 0.17 162.48)" },
  { id: 1, short: "L1", label: "Scripted", color: "oklch(0.769 0.188 70.08)" },
  { id: 2, short: "L2", label: "Adaptive", color: "oklch(0.704 0.191 22.216)" },
  {
    id: 3,
    short: "L3",
    label: "Long-horizon",
    color: "oklch(0.645 0.246 16.439)",
  },
  {
    id: 4,
    short: "L4",
    label: "Self-directed",
    color: "oklch(0.577 0.245 27.325)",
  },
] as const;

/** Append valid oklch alpha so e.g. "oklch(0.7 0.17 162)" -> "oklch(0.7 0.17 162 / 0.3)". */
function withAlpha(color: string, alpha: number): string {
  return color.replace(/\)$/, ` / ${alpha})`);
}

interface AutonomyThermometerProps {
  /** 0-1 normalized autonomy level (from /api/autonomy/current) */
  level?: number;
  /** Discrete level 0-4 from API; when provided, used for fill color to match API label */
  levelIndex?: number;
  /** Uncertainty range (e.g. 0.2); optional visual band */
  uncertainty?: number;
  /** Current level label from API (e.g. "Scripted agent (Level 1)") */
  levelLabel?: string;
  /** When true, show placeholder / muted state */
  insufficientData?: boolean;
  className?: string;
}

export function AutonomyThermometer({
  level = 0.35,
  levelIndex: levelIndexProp,
  uncertainty,
  levelLabel,
  insufficientData = false,
  className = "",
}: AutonomyThermometerProps) {
  const normalized = Math.max(0, Math.min(1, level));
  const levelIndex = levelIndexProp ?? Math.min(4, Math.round(normalized * 4));

  return (
    <Card
      className={cn(
        "border-border/80 bg-card/80 dark:bg-card/70 backdrop-blur-sm shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset]",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Autonomy Level</CardTitle>
        {levelLabel && !insufficientData && (
          <p className="text-xs text-muted-foreground font-normal" aria-hidden>
            {levelLabel}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Link
          href="/autonomy"
          className="block outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-lg -m-2 p-2"
          aria-label={
            insufficientData
              ? "View Autonomy & Risk details (insufficient data)"
              : "View Autonomy & Risk details"
          }
        >
          {/* Horizontal segmented bar */}
          <div
            className="relative flex h-9 rounded-lg overflow-hidden border border-border"
            role="img"
            aria-label={
              insufficientData
                ? "Insufficient data to determine autonomy level"
                : `Autonomy level: ${
                    levelLabel ?? `${Math.round(normalized * 100)}%`
                  }`
            }
          >
            {LEVELS.map((l) => {
              const isActive = l.id === levelIndex;
              const isPast = l.id < levelIndex;

              return (
                <div
                  key={l.id}
                  className={cn(
                    "relative flex-1 flex items-center justify-center transition-colors border-r last:border-r-0 border-border/30",
                  )}
                  style={{
                    backgroundColor: insufficientData
                      ? "var(--muted)"
                      : isActive
                        ? withAlpha(l.color, 0.55)
                        : isPast
                          ? withAlpha(l.color, 0.25)
                          : withAlpha(l.color, 0.08),
                  }}
                >
                  {/* Label inside each segment */}
                  <span
                    className={cn(
                      "text-[10px] leading-none font-medium select-none truncate px-0.5",
                      isActive
                        ? "text-foreground"
                        : isPast
                          ? "text-muted-foreground"
                          : "text-muted-foreground/70",
                      insufficientData && "text-muted-foreground/60",
                    )}
                    style={{
                      fontFamily:
                        "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
                    }}
                  >
                    {l.short}
                  </span>

                  {/* Active marker arrow */}
                  {isActive && !insufficientData && (
                    <div
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-0 h-0"
                      style={{
                        borderLeft: "5px solid transparent",
                        borderRight: "5px solid transparent",
                        borderBottom: `5px solid ${l.color}`,
                      }}
                      aria-hidden
                    />
                  )}
                </div>
              );
            })}

            {/* Uncertainty band overlay */}
            {!insufficientData && uncertainty != null && uncertainty > 0 && (
              <div
                className="absolute inset-y-0 border-x border-dashed border-muted-foreground/30 pointer-events-none"
                style={{
                  left: `${Math.max(0, (normalized - uncertainty) * 100)}%`,
                  width: `${Math.min(100, uncertainty * 2 * 100)}%`,
                }}
                aria-hidden
              />
            )}
          </div>

          {/* Level labels below the bar */}
          <div className="flex mt-1.5">
            {LEVELS.map((l) => {
              const isActive = l.id === levelIndex;
              return (
                <div
                  key={l.id}
                  className={cn(
                    "flex-1 text-center text-[9px] leading-tight truncate",
                    isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground/60",
                  )}
                  style={{
                    fontFamily:
                      "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
                  }}
                >
                  {l.label}
                </div>
              );
            })}
          </div>

          {/* Contextual interpretation */}
          <div className="mt-3 pt-2 border-t border-border/50 space-y-1.5">
            {insufficientData ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Insufficient data for reliable autonomy assessment. More signals
                are needed.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {levelIndex <= 1 &&
                    "Current AI systems operate at Level 0-1: they follow scripts and adapt within narrow domains."}
                  {levelIndex === 2 &&
                    "AI agents can adapt to novel situations within their trained domains, but lack long-horizon planning."}
                  {levelIndex === 3 &&
                    "Some AI systems demonstrate multi-step planning and tool composition across complex tasks."}
                  {levelIndex >= 4 &&
                    "AI systems show self-directed learning and autonomous goal-setting capabilities."}
                </p>
                {levelIndex < 4 && (
                  <p className="text-[10px] text-muted-foreground/70">
                    Next level requires:{" "}
                    {levelIndex <= 1 &&
                      "improved planning and cross-domain tool use."}
                    {levelIndex === 2 &&
                      "sustained long-horizon task completion and tool creation."}
                    {levelIndex === 3 &&
                      "autonomous research capability and self-improvement loops."}
                  </p>
                )}
                {/* High uncertainty disclaimer */}
                {uncertainty != null && uncertainty > 0.35 && (
                  <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
                    High uncertainty in underlying data — level may shift with
                    more signals.
                  </p>
                )}
              </>
            )}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
