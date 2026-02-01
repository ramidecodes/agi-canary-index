"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AxisSourceEntry } from "@/lib/capabilities/types";
import { ExternalLink } from "lucide-react";

interface SourceMapPanelProps {
  axis: string | null;
  axisLabel: string;
  sources: AxisSourceEntry[];
  onClose?: () => void;
  className?: string;
}

export function SourceMapPanel({
  axis,
  axisLabel,
  sources,
  onClose,
  className = "",
}: SourceMapPanelProps) {
  if (!axis) return null;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Sources for {axisLabel}</CardTitle>
        {onClose && (
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            Close
          </button>
        )}
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No source data available for this axis.
          </p>
        ) : (
          <ul className="space-y-3">
            {sources.map((s) => (
              <li
                key={s.signalId}
                className="rounded-lg border border-border p-3 text-sm"
              >
                <p className="font-medium text-foreground mb-1">
                  {s.title ?? s.claimSummary.slice(0, 80)}
                  {s.claimSummary.length > 80 ? "…" : ""}
                </p>
                {s.sourceName && (
                  <p className="text-muted-foreground mb-1">{s.sourceName}</p>
                )}
                <p className="text-muted-foreground text-xs mb-2">
                  {s.documentAcquiredAt
                    ? new Date(s.documentAcquiredAt).toLocaleDateString()
                    : ""}
                  {s.confidence != null &&
                    ` · Confidence: ${(s.confidence * 100).toFixed(0)}%`}
                </p>
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Open source <ExternalLink className="size-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
