"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** 5-level scale matching /api/autonomy/current and autonomy-gauge. @see docs/features/17-home-autonomy-level-component.md */
const LEVELS = [
  { id: 0, label: "Tool-only (Level 0)", color: "oklch(0.696 0.17 162.48)" },
  {
    id: 1,
    label: "Scripted agent (Level 1)",
    color: "oklch(0.769 0.188 70.08)",
  },
  {
    id: 2,
    label: "Adaptive agent (Level 2)",
    color: "oklch(0.704 0.191 22.216)",
  },
  {
    id: 3,
    label: "Long-horizon agent (Level 3)",
    color: "oklch(0.645 0.246 16.439)",
  },
  {
    id: 4,
    label: "Self-directed (Level 4)",
    color: "oklch(0.577 0.245 27.325)",
  },
] as const;

/** Append valid oklch alpha so e.g. "oklch(0.7 0.17 162)" → "oklch(0.7 0.17 162 / 0.3)". */
function withAlpha(color: string, alpha: number): string {
  return color.replace(/\)$/, ` / ${alpha})`);
}

interface AutonomyThermometerProps {
  /** 0–1 normalized autonomy level (from /api/autonomy/current) */
  level?: number;
  /** Discrete level 0–4 from API; when provided, used for fill color to match API label */
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
  const segmentHeight = 100 / LEVELS.length;
  /** Ensure fill is visible: minimum 18% height so low values (e.g. 0.35) still read clearly */
  const fillHeight = Math.max(18, normalized * 100);

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
          <div
            className="relative h-32 w-12 rounded-lg overflow-hidden border border-border"
            role="img"
            aria-label={
              insufficientData
                ? "Insufficient data to determine autonomy level"
                : `Autonomy level: ${
                    levelLabel ?? `${Math.round(normalized * 100)}%`
                  }`
            }
          >
            {/* Background gradient segments (5 levels) */}
            <div className="absolute inset-0 flex flex-col">
              {LEVELS.map((l) => (
                <div
                  key={l.id}
                  className="flex-1 transition-colors"
                  style={{
                    backgroundColor: withAlpha(l.color, 0.15),
                    minHeight: `${segmentHeight}%`,
                  }}
                />
              ))}
            </div>

            {/* Fill indicator — stronger opacity for visibility */}
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out",
                insufficientData && "opacity-50",
              )}
              style={{
                height: `${fillHeight}%`,
                background: insufficientData
                  ? "var(--muted)"
                  : withAlpha(LEVELS[levelIndex].color, 0.6),
              }}
            />

            {/* Optional uncertainty band (subtle) */}
            {!insufficientData && uncertainty != null && uncertainty > 0 && (
              <div
                className="absolute left-0 right-0 border border-dashed border-muted-foreground/30 rounded-sm pointer-events-none"
                style={{
                  bottom: `${Math.max(0, (normalized - uncertainty) * 100)}%`,
                  height: `${Math.min(100, uncertainty * 2 * 100)}%`,
                }}
                aria-hidden
              />
            )}

            {/* Level markers */}
            <div className="absolute inset-0 flex flex-col justify-between py-1">
              {LEVELS.map((l) => (
                <div
                  key={l.id}
                  className="h-px w-full"
                  style={{ backgroundColor: withAlpha(l.color, 0.31) }}
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
