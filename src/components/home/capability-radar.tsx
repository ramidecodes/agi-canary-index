"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AXES } from "@/lib/signal/schemas";
import type { Snapshot, SnapshotHistoryEntry } from "@/lib/home/types";
import { useHomeStore } from "@/lib/home/store";

const AXIS_LABELS: Record<string, string> = {
  reasoning: "Reasoning",
  learning_efficiency: "Learning",
  long_term_memory: "Memory",
  planning: "Planning",
  tool_use: "Tool Use",
  social_cognition: "Social",
  multimodal_perception: "Multimodal",
  robustness: "Robustness",
  alignment_safety: "Alignment",
};

/** Minimum 7-day signal count for axis to be considered "backed". */
const MIN_SIGNAL_BACKING = 3;

function scoreToRadius(score: number): number {
  return Math.max(0, Math.min(1, (score + 1) / 2));
}

/** Get trend arrow character based on delta. */
function getTrendArrow(delta: number): { char: string; color: string } {
  if (delta > 0.02) return { char: "▲", color: "oklch(0.72 0.19 142)" }; // green
  if (delta < -0.02) return { char: "▼", color: "oklch(0.63 0.24 25)" }; // red
  return { char: "–", color: "currentColor" };
}

interface CapabilityRadarProps {
  snapshot: Snapshot | null;
  history: SnapshotHistoryEntry[];
  size?: number;
  className?: string;
  /** When provided, use these instead of home store (e.g. capability profile page). */
  selectedAxis?: string | null;
  onAxisClick?: (axis: string) => void;
  /** Axis keys to highlight (e.g. from active canary filter). */
  highlightAxes?: string[];
}

export function CapabilityRadar({
  snapshot,
  history,
  size = 360,
  className = "",
  selectedAxis: selectedAxisProp,
  onAxisClick,
  highlightAxes,
}: CapabilityRadarProps) {
  const homeStore = useHomeStore();
  const selectedRadarAxis =
    selectedAxisProp !== undefined
      ? selectedAxisProp
      : homeStore.selectedRadarAxis;
  const setSelectedRadarAxis = onAxisClick
    ? (axis: string | null) => {
        if (axis) onAxisClick(axis);
      }
    : homeStore.setSelectedRadarAxis;

  const { polygons, axisPoints, center } = useMemo(() => {
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size * 0.38;
    const center = { x: cx, y: cy };

    const angleStep = (2 * Math.PI) / AXES.length;
    const getAngle = (i: number) => -Math.PI / 2 + i * angleStep;

    const axisPoints = AXES.map((axis, i) => {
      const angle = getAngle(i);
      return {
        axis,
        label: AXIS_LABELS[axis] ?? axis,
        x: cx + maxR * Math.cos(angle),
        y: cy + maxR * Math.sin(angle),
        angle,
      };
    });

    const scoresToPolygon = (
      scores: Record<string, { score?: number }>,
    ): string => {
      const pts = AXES.map((axis, i) => {
        const entry = scores[axis];
        const s = entry?.score != null ? scoreToRadius(Number(entry.score)) : 0;
        const r = s * maxR;
        const angle = getAngle(i);
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      });
      return pts.join(" ");
    };

    const currentPolygon = snapshot?.axisScores
      ? scoresToPolygon(snapshot.axisScores)
      : null;

    const ghostHistory = history.slice(0, 3);
    const ghosts = ghostHistory.map((h) => ({
      date: h.date,
      pts: scoresToPolygon(h.axisScores),
    }));

    return {
      polygons: { current: currentPolygon, ghosts },
      axisPoints,
      center,
    };
  }, [snapshot, history, size]);

  const uncertaintyGlow = useMemo(() => {
    if (!snapshot?.axisScores) return null;
    const scores = snapshot.axisScores;
    const maxR = size * 0.38;
    const cx = size / 2;
    const cy = size / 2;
    const angleStep = (2 * Math.PI) / AXES.length;
    const getAngle = (i: number) => -Math.PI / 2 + i * angleStep;

    const pts = AXES.map((axis, i) => {
      const entry = scores[axis];
      const s = entry?.score != null ? scoreToRadius(Number(entry.score)) : 0;
      const u = entry?.uncertainty ?? 0.3;
      const r = Math.min(1, s + u) * maxR;
      const angle = getAngle(i);
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    });
    return pts.join(" ");
  }, [snapshot, size]);

  const hasData = !!polygons.current;

  return (
    <div className={className}>
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="img"
        aria-label="Capability radar chart showing 9 cognitive domains"
      >
        <svg
          width={size}
          height={size}
          className="overflow-hidden"
          style={{ maxWidth: "100%", height: "auto" }}
          aria-labelledby="radar-title"
        >
          <title id="radar-title">
            Capability radar chart showing 9 cognitive domains
          </title>
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Dark halo behind text labels for contrast on any background */}
            <filter id="label-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="black" floodOpacity="0.7" />
            </filter>
            {/* Cold blue accent — tuned to pop on dark background (Instrumental Minimalism) */}
            <linearGradient id="radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                stopColor="oklch(0.58 0.22 264)"
                stopOpacity="0.45"
              />
              <stop
                offset="100%"
                stopColor="oklch(0.58 0.22 264)"
                stopOpacity="0.12"
              />
            </linearGradient>
            <linearGradient id="glow-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                stopColor="oklch(0.58 0.22 264)"
                stopOpacity="0.2"
              />
              <stop
                offset="100%"
                stopColor="oklch(0.58 0.22 264)"
                stopOpacity="0.03"
              />
            </linearGradient>
          </defs>

          {/* Grid circles */}
          {[0.25, 0.5, 0.75, 1].map((scale) => {
            const r = size * 0.38 * scale;
            return (
              <circle
                key={scale}
                cx={center.x}
                cy={center.y}
                r={r}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.18"
                strokeWidth="0.5"
              />
            );
          })}

          {/* Axis lines */}
          {axisPoints.map(({ x, y }) => (
            <line
              key={`line-${x}-${y}`}
              x1={center.x}
              y1={center.y}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.28"
              strokeWidth="0.5"
            />
          ))}

          {/* Uncertainty glow (outer band) */}
          {uncertaintyGlow && (
            <polygon
              points={uncertaintyGlow}
              fill="url(#glow-fill)"
              filter="url(#glow)"
              className="transition-opacity duration-300"
            />
          )}

          {/* Ghost lines (historical) — improved visibility */}
          {polygons.ghosts.map((g, idx) => (
            <polygon
              key={`ghost-${g.date}`}
              points={g.pts}
              fill="none"
              stroke="oklch(0.58 0.22 264)"
              strokeOpacity={0.2 - idx * 0.05}
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          ))}
          {/* Ghost date labels */}
          {polygons.ghosts.length > 0 && size > 300 && (
            <text
              x={center.x}
              y={8}
              textAnchor="middle"
              fill="currentColor"
              fillOpacity={0.5}
              fontSize="9"
              style={{
                fontFamily:
                  "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
              }}
            >
              {polygons.ghosts.length > 0
                ? `Ghost: ${polygons.ghosts.map((g) => g.date.slice(5)).join(", ")}`
                : ""}
            </text>
          )}

          {/* Current capability polygon */}
          {polygons.current && (
            <polygon
              points={polygons.current}
              fill="url(#radar-fill)"
              stroke="oklch(0.58 0.22 264)"
              strokeWidth="1.5"
              className="transition-all duration-500 ease-out"
            />
          )}

          {/* Low-data axis indicators — dashed lines for axes with insufficient signal backing */}
          {snapshot?.axisScores &&
            axisPoints.map(({ axis, x, y }) => {
              const entry = snapshot.axisScores[axis] as {
                signalCount?: number;
              } | undefined;
              const signalCount = entry?.signalCount ?? 0;
              if (signalCount >= MIN_SIGNAL_BACKING) return null;

              // Draw a dashed circle segment at the axis endpoint
              const r = size * 0.38 * scoreToRadius(
                snapshot.axisScores[axis]?.score != null
                  ? Number(snapshot.axisScores[axis].score)
                  : 0,
              );
              const angle = Math.atan2(y - center.y, x - center.x);
              const px = center.x + r * Math.cos(angle);
              const py = center.y + r * Math.sin(angle);

              return (
                <circle
                  key={`low-data-${axis}`}
                  cx={px}
                  cy={py}
                  r={4}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={0.3}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
              );
            })}

          {/* Axis labels (clickable) with trend arrows */}
          {axisPoints.map(({ axis, label, x, y }) => {
            const isSelected = selectedRadarAxis === axis;
            const isHighlighted = highlightAxes?.includes(axis) ?? false;
            const labelR = size * 0.44;
            const angle = Math.atan2(y - center.y, x - center.x);
            const lx = center.x + labelR * Math.cos(angle);
            const ly = center.y + labelR * Math.sin(angle);

            // Trend arrow data
            const axisEntry = snapshot?.axisScores?.[axis] as {
              delta?: number;
              signalCount?: number;
            } | undefined;
            const delta = axisEntry?.delta ?? 0;
            const signalCount = axisEntry?.signalCount ?? 0;
            const trend = getTrendArrow(delta);
            const isLowData = signalCount < MIN_SIGNAL_BACKING;

            const labelContent = (
              <g className="pointer-events-none select-none" filter="url(#label-shadow)">
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="currentColor"
                  fillOpacity={
                    isLowData ? 0.55 : isSelected ? 1 : isHighlighted ? 0.95 : 0.88
                  }
                  fontSize={size > 400 ? "13" : "11"}
                  fontWeight={isSelected || isHighlighted ? 600 : 400}
                  style={{
                    fontFamily:
                      "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
                  }}
                >
                  {label}
                </text>
                {/* Trend arrow — shown when there is data */}
                {snapshot?.axisScores && !isLowData && (
                  <text
                    x={lx + (size > 400 ? 38 : 30)}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={trend.color}
                    fillOpacity={0.95}
                    fontSize="9"
                    style={{
                      fontFamily:
                        "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
                    }}
                  >
                    {trend.char}
                  </text>
                )}
                {/* No data indicator */}
                {isLowData && snapshot?.axisScores && (
                  <text
                    x={lx + (size > 400 ? 38 : 30)}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="currentColor"
                    fillOpacity={0.45}
                    fontSize="8"
                    style={{
                      fontFamily:
                        "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
                    }}
                  >
                    ?
                  </text>
                )}
              </g>
            );

            if (onAxisClick) {
              return (
                // biome-ignore lint/a11y/useSemanticElements: SVG group cannot use <button>; role="button" is correct for interactive SVG regions
                <g
                  key={axis}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer outline-none focus:ring-2 focus:ring-primary rounded"
                  aria-label={`View ${label} details`}
                  onMouseEnter={() => setSelectedRadarAxis(axis)}
                  onMouseLeave={() => setSelectedRadarAxis(null)}
                  onClick={() => onAxisClick(axis)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onAxisClick(axis);
                    }
                  }}
                >
                  {labelContent}
                </g>
              );
            }

            return (
              <Link
                key={axis}
                href={`/capabilities?axis=${axis}`}
                className="outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded"
                onMouseEnter={() => setSelectedRadarAxis(axis)}
                onMouseLeave={() => setSelectedRadarAxis(null)}
              >
                {labelContent}
              </Link>
            );
          })}
        </svg>

        {!hasData && (
          <div
            className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm animate-radar-await"
            style={{
              pointerEvents: "none",
              fontFamily:
                "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
            }}
          >
            Awaiting data
          </div>
        )}
      </div>

      {/* Legend */}
      {hasData && (
        <div
          className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground"
          style={{
            fontFamily:
              "var(--font-ibm-plex-mono), var(--font-geist-mono), ui-monospace, monospace",
          }}
        >
          <span className="flex items-center gap-1.5">
            <svg width="16" height="6" role="presentation">
              <line
                x1="0"
                y1="3"
                x2="16"
                y2="3"
                stroke="oklch(0.58 0.22 264)"
                strokeWidth="1.5"
              />
            </svg>
            Current
          </span>
          {polygons.ghosts.length > 0 && (
            <span className="flex items-center gap-1.5">
              <svg width="16" height="6" role="presentation">
                <line
                  x1="0"
                  y1="3"
                  x2="16"
                  y2="3"
                  stroke="oklch(0.58 0.22 264)"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                  strokeOpacity="0.5"
                />
              </svg>
              Previous days
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" role="presentation">
              <circle
                cx="5"
                cy="5"
                r="4"
                fill="oklch(0.58 0.22 264)"
                fillOpacity="0.2"
              />
            </svg>
            Uncertainty
          </span>
        </div>
      )}
    </div>
  );
}
