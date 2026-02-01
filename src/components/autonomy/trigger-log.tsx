"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface Trigger {
  signalId: string;
  claimSummary: string;
  confidence: number;
  axesAffected: string[];
  createdAt: string;
  sourceName: string | null;
  sourceUrl: string | null;
  documentUrl: string | null;
}

const AXIS_LABELS: Record<string, string> = {
  tool_use: "Tool use",
  planning: "Planning",
  alignment_safety: "Alignment",
};

interface TriggerLogProps {
  triggers: Trigger[];
  className?: string;
}

export function TriggerLog({ triggers, className = "" }: TriggerLogProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          What triggered this?
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Recent signals affecting autonomy and risk canaries
        </p>
      </CardHeader>
      <CardContent>
        {triggers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No recent triggers. Signals from tool_use, planning, and
            alignment_safety axes will appear here.
          </p>
        ) : (
          <ul className="space-y-4">
            {triggers.map((t) => {
              const dateStr = t.createdAt
                ? new Date(t.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : null;
              const linkUrl = t.documentUrl ?? t.sourceUrl;

              return (
                <li
                  key={t.signalId}
                  className="border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <p className="text-sm font-medium">{t.claimSummary}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {t.sourceName && (
                      <span className="text-xs text-muted-foreground">
                        {t.sourceName}
                        {dateStr && ` · ${dateStr}`}
                      </span>
                    )}
                    {t.axesAffected.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Affected:{" "}
                        {t.axesAffected
                          .map((a) => AXIS_LABELS[a] ?? a)
                          .join(", ")}
                      </span>
                    )}
                  </div>
                  {linkUrl && (
                    <a
                      href={linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      View source →
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
