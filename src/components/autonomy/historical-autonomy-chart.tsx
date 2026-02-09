"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface AutonomyHistoryPoint {
  date: string;
  level: number;
  low: number;
  high: number;
}

/** Simple moving average smoothing for trend line. */
function computeSmoothedTrend(data: { level: number }[], window = 3): number[] {
  return data.map((_, i) => {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(data.length, i + Math.ceil(window / 2) + 1);
    const slice = data.slice(start, end);
    const avg = slice.reduce((sum, d) => sum + d.level, 0) / slice.length;
    return Math.round(avg * 10) / 10;
  });
}

interface HistoricalAutonomyChartProps {
  history: AutonomyHistoryPoint[];
  className?: string;
}

export function HistoricalAutonomyChart({
  history,
  className = "",
}: HistoricalAutonomyChartProps) {
  const limitedData = history.length < 7;

  const chartData = useMemo(() => {
    const smoothed = computeSmoothedTrend(history);
    return history.map((h, i) => ({
      date: h.date,
      level: h.level,
      smoothed: smoothed[i],
      low: h.low,
      high: h.high,
      bandHeight: h.high - h.low,
    }));
  }, [history]);

  if (history.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-[280px] text-muted-foreground text-sm ${className}`}
      >
        No historical data yet
      </div>
    );
  }

  return (
    <div className={`relative h-[280px] w-full ${className}`}>
      {/* Limited data watermark */}
      {limitedData && (
        <div className="absolute top-2 right-2 z-10 text-[10px] text-muted-foreground/50 bg-background/80 px-2 py-0.5 rounded border border-border/30">
          Limited data ({history.length} points)
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => {
              const d = new Date(`${v}T12:00:00`);
              return d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "2-digit",
              });
            }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload;
              if (!p) return null;
              return (
                <div className="rounded-lg border bg-background p-2 text-sm shadow">
                  <p className="font-medium">
                    {new Date(`${p.date}T12:00:00`).toLocaleDateString()}
                  </p>
                  <p>Autonomy level: {p.level}%</p>
                  <p className="text-primary/80">Trend: {p.smoothed}%</p>
                  <p className="text-muted-foreground">
                    Uncertainty range: {p.low}% – {p.high}%
                  </p>
                </div>
              );
            }}
          />
          {/* Confidence band */}
          <Area
            type="monotone"
            dataKey="low"
            stackId="band"
            stroke="transparent"
            fill="transparent"
          />
          <Area
            type="monotone"
            dataKey="bandHeight"
            stackId="band"
            stroke="transparent"
            fill="hsl(var(--chart-1) / 0.15)"
          />
          {/* Raw data points as faded dots */}
          <Line
            type="monotone"
            dataKey="level"
            stroke="hsl(var(--chart-1) / 0.3)"
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={{ r: 3, fill: "hsl(var(--chart-1) / 0.4)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          {/* Smoothed trend line — primary visual */}
          <Line
            type="monotone"
            dataKey="smoothed"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "hsl(var(--chart-1))" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
