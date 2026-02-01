"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface CoverageBreakdown {
  id: string;
  label: string;
  description: string;
  score: number;
  isGap: boolean;
}

interface EvaluationCoverageMeterProps {
  overallCoverage: number;
  gapCount: number;
  breakdown: CoverageBreakdown[];
  lastUpdated: string | null;
  className?: string;
}

export function EvaluationCoverageMeter({
  overallCoverage,
  gapCount,
  breakdown,
  lastUpdated,
  className = "",
}: EvaluationCoverageMeterProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Evaluation coverage
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          How well current autonomy is being evaluated
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Overall coverage</span>
            <span
              className={
                gapCount > 0 ? "text-amber-600 dark:text-amber-400" : ""
              }
            >
              {overallCoverage}%
              {gapCount > 0 &&
                ` · ${gapCount} gap${gapCount > 1 ? "s" : ""} highlighted`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${overallCoverage}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {breakdown.map((b) => (
            <div
              key={b.id}
              className={`flex items-center justify-between text-sm p-2 rounded-lg ${
                b.isGap
                  ? "bg-amber-500/10 border border-amber-500/20"
                  : "bg-muted/30"
              }`}
            >
              <div>
                <span className="font-medium">{b.label}</span>
                {b.isGap && (
                  <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                    Coverage gap
                  </span>
                )}
              </div>
              <span
                className={b.isGap ? "text-amber-600 dark:text-amber-400" : ""}
              >
                {b.score}%
              </span>
            </div>
          ))}
        </div>

        {lastUpdated && (
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(lastUpdated).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
