"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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

interface HistoricalAutonomyChartProps {
  history: AutonomyHistoryPoint[];
  className?: string;
}

export function HistoricalAutonomyChart({
  history,
  className = "",
}: HistoricalAutonomyChartProps) {
  if (history.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-[280px] text-muted-foreground text-sm ${className}`}
      >
        No historical data yet
      </div>
    );
  }

  const chartData = history.map((h) => ({
    date: h.date,
    level: h.level,
    low: h.low,
    high: h.high,
    bandHeight: h.high - h.low,
  }));

  return (
    <div className={`h-[280px] w-full ${className}`}>
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
                  <p className="text-muted-foreground">
                    Uncertainty range: {p.low}% – {p.high}%
                  </p>
                </div>
              );
            }}
          />
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
            fill="hsl(var(--chart-1) / 0.25)"
          />
          <Area
            type="monotone"
            dataKey="level"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill="transparent"
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
