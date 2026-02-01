"use client";

/**
 * Vertical autonomy scale gauge (custom SVG, no D3).
 * Levels 0–4: Tool-only → Scripted → Adaptive → Long-horizon → Self-directed.
 * Shows current position, uncertainty zone, never shows "AGI".
 * @see docs/features/08-autonomy-risk.md
 */

const LEVELS = [
  { id: 0, label: "Tool-only (Level 0)" },
  { id: 1, label: "Scripted agent (Level 1)" },
  { id: 2, label: "Adaptive agent (Level 2)" },
  { id: 3, label: "Long-horizon agent (Level 3)" },
  { id: 4, label: "Self-directed (Level 4)" },
] as const;

const COLORS = [
  "oklch(0.696 0.17 162.48)",
  "oklch(0.769 0.188 70.08)",
  "oklch(0.704 0.191 22.216)",
  "oklch(0.645 0.246 16.439)",
  "oklch(0.577 0.245 27.325)",
];

interface AutonomyGaugeProps {
  /** Normalized 0–1 autonomy level */
  level: number;
  /** Uncertainty range (e.g. 0.2 = ±20%) */
  uncertainty?: number;
  insufficientData?: boolean;
  size?: number;
  className?: string;
}

export function AutonomyGauge({
  level = 0.35,
  uncertainty = 0.2,
  insufficientData = false,
  size = 200,
  className = "",
}: AutonomyGaugeProps) {
  const normalized = Math.max(0, Math.min(1, level));
  const unc = Math.max(0.05, Math.min(0.5, uncertainty ?? 0.2));
  const low = Math.max(0, normalized - unc);
  const high = Math.min(1, normalized + unc);

  const w = 48;
  const h = size;
  const padding = 8;
  const trackTop = padding;
  const trackBottom = h - padding;
  const trackH = trackBottom - trackTop;

  const yToPx = (y: number) => trackBottom - y * trackH;
  const markerY = yToPx(normalized);
  const lowY = yToPx(high);
  const highY = yToPx(low);

  const levelIndex = Math.min(4, Math.floor(normalized * 5));
  const currentColor = COLORS[levelIndex] ?? COLORS[0];

  return (
    <div
      className={className}
      role="img"
      aria-label={
        insufficientData
          ? "Insufficient data to determine autonomy level"
          : `Autonomy level: ${
              LEVELS[levelIndex]?.label ?? "Unknown"
            }, ${Math.round(normalized * 100)}%`
      }
    >
      <svg
        width={w}
        height={h}
        className="overflow-visible"
        style={{ maxWidth: "100%", height: "auto" }}
        aria-labelledby="autonomy-gauge-title"
      >
        <title id="autonomy-gauge-title">
          {insufficientData
            ? "Insufficient data to determine autonomy level"
            : `Autonomy level: ${
                LEVELS[levelIndex]?.label ?? "Unknown"
              }, ${Math.round(normalized * 100)}%`}
        </title>
        <defs>
          <linearGradient id="autonomy-fill" x1="0%" y1="100%" x2="0%" y2="0%">
            {COLORS.map((c, i) => (
              <stop
                key={c}
                offset={`${(i / (COLORS.length - 1)) * 100}%`}
                stopColor={c}
                stopOpacity="0.3"
              />
            ))}
          </linearGradient>
          <filter
            id="uncertainty-blur"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track segments */}
        <rect
          x={0}
          y={trackTop}
          width={w}
          height={trackH}
          fill="url(#autonomy-fill)"
          rx={4}
          opacity={insufficientData ? 0.4 : 0.6}
        />

        {/* Uncertainty zone (blurred) */}
        {!insufficientData && high > low && (
          <rect
            x={0}
            y={highY}
            width={w}
            height={Math.max(4, lowY - highY)}
            fill={currentColor}
            fillOpacity="0.35"
            rx={2}
            filter="url(#uncertainty-blur)"
          />
        )}

        {/* Current position marker */}
        {!insufficientData && (
          <line
            x1={0}
            y1={markerY}
            x2={w}
            y2={markerY}
            stroke={currentColor}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}

        {/* Level divider lines */}
        {[0.2, 0.4, 0.6, 0.8].map((y) => (
          <line
            key={y}
            x1={0}
            y1={yToPx(y)}
            x2={w}
            y2={yToPx(y)}
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeWidth="0.5"
          />
        ))}
      </svg>

      <div className="mt-2 space-y-0.5">
        {LEVELS.map((l, i) => (
          <div
            key={l.id}
            className="text-xs text-muted-foreground flex items-center gap-2"
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[i] ?? "currentColor" }}
            />
            {l.label}
          </div>
        ))}
      </div>

      {insufficientData && (
        <p className="mt-2 text-xs text-muted-foreground italic">
          Insufficient data
        </p>
      )}
    </div>
  );
}
