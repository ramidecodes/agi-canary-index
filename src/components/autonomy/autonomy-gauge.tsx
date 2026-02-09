"use client";

/**
 * Horizontal autonomy scale gauge (redesigned for clarity).
 * Levels 0-4: Tool-only -> Scripted -> Adaptive -> Long-horizon -> Self-directed.
 * Shows current position, uncertainty zone, never shows "AGI".
 * @see docs/features/08-autonomy-risk.md
 */

import { cn } from "@/lib/utils";

const LEVELS = [
  { id: 0, short: "L0", label: "Tool-only", color: "oklch(0.696 0.17 162.48)" },
  { id: 1, short: "L1", label: "Scripted agent", color: "oklch(0.769 0.188 70.08)" },
  { id: 2, short: "L2", label: "Adaptive agent", color: "oklch(0.704 0.191 22.216)" },
  { id: 3, short: "L3", label: "Long-horizon agent", color: "oklch(0.645 0.246 16.439)" },
  { id: 4, short: "L4", label: "Self-directed", color: "oklch(0.577 0.245 27.325)" },
] as const;

function withAlpha(color: string, alpha: number): string {
  return color.replace(/\)$/, ` / ${alpha})`);
}

interface AutonomyGaugeProps {
  /** Normalized 0-1 autonomy level */
  level: number;
  /** Uncertainty range (e.g. 0.2 = +/-20%) */
  uncertainty?: number;
  insufficientData?: boolean;
  size?: number;
  className?: string;
}

export function AutonomyGauge({
  level = 0.35,
  uncertainty = 0.2,
  insufficientData = false,
  className = "",
}: AutonomyGaugeProps) {
  const normalized = Math.max(0, Math.min(1, level));
  const unc = Math.max(0.05, Math.min(0.5, uncertainty ?? 0.2));
  const low = Math.max(0, normalized - unc);
  const high = Math.min(1, normalized + unc);

  const levelIndex = Math.min(4, Math.floor(normalized * 5));
  const currentLevel = LEVELS[levelIndex];
  const pctLabel = `${Math.round(normalized * 100)}%`;

  return (
    <div
      className={cn("w-full max-w-md", className)}
      role="img"
      aria-label={
        insufficientData
          ? "Insufficient data to determine autonomy level"
          : `Autonomy level: ${currentLevel?.label ?? "Unknown"}, ${pctLabel}`
      }
    >
      {/* Header: current level + percentage */}
      <div className="flex items-baseline justify-between mb-3">
        <span
          className="text-sm font-medium text-foreground"
          style={{
            fontFamily:
              "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
          }}
        >
          {insufficientData ? "Insufficient data" : `${currentLevel?.label} (Level ${levelIndex})`}
        </span>
        {!insufficientData && (
          <span
            className="text-sm text-muted-foreground tabular-nums"
            style={{
              fontFamily:
                "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
            }}
          >
            {pctLabel}
          </span>
        )}
      </div>

      {/* Horizontal segmented bar */}
      <div className="relative flex h-10 rounded-lg overflow-hidden border border-border">
        {LEVELS.map((l) => {
          const isActive = l.id === levelIndex;
          const isPast = l.id < levelIndex;

          return (
            <div
              key={l.id}
              className="relative flex-1 flex items-center justify-center border-r last:border-r-0 border-border/30 transition-colors"
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
              <span
                className={cn(
                  "text-[10px] sm:text-xs leading-none font-medium select-none truncate px-1",
                  isActive
                    ? "text-foreground"
                    : isPast
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50",
                  insufficientData && "text-muted-foreground/40",
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
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: "6px solid transparent",
                    borderRight: "6px solid transparent",
                    borderBottom: `6px solid ${l.color}`,
                  }}
                  aria-hidden
                />
              )}
            </div>
          );
        })}

        {/* Uncertainty band overlay */}
        {!insufficientData && high > low && (
          <div
            className="absolute inset-y-0 border-x-2 border-dashed border-muted-foreground/25 pointer-events-none"
            style={{
              left: `${low * 100}%`,
              width: `${(high - low) * 100}%`,
            }}
            aria-hidden
          />
        )}
      </div>

      {/* Level labels below the bar with tick marks */}
      <div className="flex mt-1">
        {LEVELS.map((l) => {
          const isActive = l.id === levelIndex;
          return (
            <div
              key={l.id}
              className={cn(
                "flex-1 text-center",
                isActive ? "text-foreground font-medium" : "text-muted-foreground/60",
              )}
            >
              <div
                className="mx-auto w-px h-1.5 mb-0.5"
                style={{
                  backgroundColor: isActive ? l.color : "currentColor",
                  opacity: isActive ? 1 : 0.3,
                }}
              />
              <span
                className="text-[9px] sm:text-[10px] leading-tight block truncate"
                style={{
                  fontFamily:
                    "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
                }}
              >
                {l.label}
              </span>
            </div>
          );
        })}
      </div>

      {insufficientData && (
        <p className="mt-3 text-xs text-muted-foreground italic">
          Insufficient data
        </p>
      )}
    </div>
  );
}
