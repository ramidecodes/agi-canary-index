"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";
import type { AxisHistoryPoint } from "@/lib/capabilities/types";

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

interface AxisDetailModalProps {
  axis: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: AxisHistoryPoint[];
  description?: string;
}

export function AxisDetailModal({
  axis,
  open,
  onOpenChange,
  history,
  description,
}: AxisDetailModalProps) {
  const label = axis ? (AXIS_LABELS[axis] ?? axis) : "";

  const chartData = history.map((p) => {
    const low = Math.round(((p.low + 1) / 2) * 100);
    const high = Math.round(((p.high + 1) / 2) * 100);
    return {
      date: p.date,
      scorePct: p.scorePct,
      low,
      high,
      bandHeight: high - low,
      score: p.score,
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          <div>
            <h4 className="text-sm font-medium mb-2">
              Historical score (0–100%)
            </h4>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No history data for this axis.
              </p>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
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
                              {new Date(
                                `${p.date}T12:00:00`,
                              ).toLocaleDateString()}
                            </p>
                            <p>Score: {p.scorePct}%</p>
                            <p className="text-muted-foreground">
                              Range: {p.low}% – {p.high}%
                            </p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      y={50}
                      stroke="var(--muted-foreground)"
                      strokeDasharray="2 2"
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
                    <Line
                      type="monotone"
                      dataKey="scorePct"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Chart data available in table format for screen readers. Score is
            normalized from -1..1 to 0–100%. Shaded area shows uncertainty band.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
