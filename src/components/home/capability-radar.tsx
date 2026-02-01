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

function scoreToRadius(score: number): number {
  return Math.max(0, Math.min(1, (score + 1) / 2));
}

interface CapabilityRadarProps {
  snapshot: Snapshot | null;
  history: SnapshotHistoryEntry[];
  size?: number;
  className?: string;
  /** When provided, use these instead of home store (e.g. capability profile page). */
  selectedAxis?: string | null;
  onAxisClick?: (axis: string) => void;
}

export function CapabilityRadar({
  snapshot,
  history,
  size = 360,
  className = "",
  selectedAxis: selectedAxisProp,
  onAxisClick,
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
      const r = (s + u) * maxR;
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
          className="overflow-visible"
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
            <linearGradient id="radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                stopColor="oklch(0.488 0.243 264.376)"
                stopOpacity="0.4"
              />
              <stop
                offset="100%"
                stopColor="oklch(0.488 0.243 264.376)"
                stopOpacity="0.1"
              />
            </linearGradient>
            <linearGradient id="glow-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                stopColor="oklch(0.488 0.243 264.376)"
                stopOpacity="0.15"
              />
              <stop
                offset="100%"
                stopColor="oklch(0.488 0.243 264.376)"
                stopOpacity="0.02"
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
                strokeOpacity="0.12"
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
              strokeOpacity="0.2"
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

          {/* Ghost lines (historical) */}
          {polygons.ghosts.map((g, idx) => (
            <polygon
              key={`ghost-${g.date}`}
              points={g.pts}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.08 - idx * 0.02}
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          ))}

          {/* Current capability polygon */}
          {polygons.current && (
            <polygon
              points={polygons.current}
              fill="url(#radar-fill)"
              stroke="oklch(0.488 0.243 264.376)"
              strokeWidth="1.5"
              className="transition-all duration-500 ease-out"
            />
          )}

          {/* Axis labels (clickable) */}
          {axisPoints.map(({ axis, label, x, y }) => {
            const isSelected = selectedRadarAxis === axis;
            const labelR = size * 0.44;
            const angle = Math.atan2(y - center.y, x - center.x);
            const lx = center.x + labelR * Math.cos(angle);
            const ly = center.y + labelR * Math.sin(angle);

            const labelContent = (
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="currentColor"
                fillOpacity={isSelected ? 1 : 0.7}
                fontSize={size > 400 ? "13" : "11"}
                fontWeight={isSelected ? 600 : 400}
                className="pointer-events-none select-none"
              >
                {label}
              </text>
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
            className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm"
            style={{ pointerEvents: "none" }}
          >
            Awaiting data
          </div>
        )}
      </div>
    </div>
  );
}
