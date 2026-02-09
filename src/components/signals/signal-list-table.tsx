"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AXIS_LABELS,
  TIER_LABELS,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_COLORS,
} from "@/lib/signals/types";
import type { SignalExplorerItem, SignalClassification } from "@/lib/signals/types";
import { cn } from "@/lib/utils";

export interface SignalListTableProps {
  signals: SignalExplorerItem[];
  onRowClick: (signal: SignalExplorerItem) => void;
  onSourceClick?: (sourceId: string) => void;
  isLoading?: boolean;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function truncate(s: string, len: number): string {
  if (s.length <= len) return s;
  return `${s.slice(0, len)}…`;
}

export function SignalListTable({
  signals,
  onRowClick,
  onSourceClick,
  isLoading,
}: SignalListTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <div className="p-8 text-center text-muted-foreground text-sm">
          Loading signals…
        </div>
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="rounded-lg border">
        <div className="p-12 text-center text-muted-foreground">
          <p className="font-medium">No signals found</p>
          <p className="text-sm mt-1">
            Try adjusting your filters or search query.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section
      className="max-h-[600px] overflow-auto rounded-lg border"
      aria-label="Signal list"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Date</TableHead>
            <TableHead className="min-w-[200px]">Claim</TableHead>
            <TableHead className="w-[140px]">Axes</TableHead>
            <TableHead className="w-[80px]">Conf.</TableHead>
            <TableHead className="w-[90px]">Type</TableHead>
            <TableHead className="w-[140px]">Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signals.map((signal) => {
            const axes = signal.axesImpacted ?? [];
            const axisLabels = axes
              .slice(0, 2)
              .map((a) => AXIS_LABELS[a.axis] ?? a.axis)
              .join(", ");
            const hasMore = axes.length > 2;

            return (
              <TableRow
                key={signal.id}
                className="cursor-pointer"
                onClick={() => onRowClick(signal)}
              >
                <TableCell className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(signal.createdAt)}
                </TableCell>
                <TableCell className="py-2 max-w-[280px]">
                  <span className="line-clamp-2 text-sm">
                    {truncate(signal.claimSummary, 120)}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-xs text-muted-foreground">
                    {axisLabels}
                    {hasMore ? ` +${axes.length - 2}` : ""}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <span
                    className={
                      signal.confidence >= 0.7
                        ? "text-green-600 dark:text-green-400"
                        : signal.confidence >= 0.5
                          ? "text-muted-foreground"
                          : "text-muted-foreground/70"
                    }
                  >
                    {(signal.confidence * 100).toFixed(0)}%
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs border",
                      CLASSIFICATION_COLORS[
                        signal.classification as SignalClassification
                      ] ?? CLASSIFICATION_COLORS.other,
                    )}
                  >
                    {CLASSIFICATION_LABELS[
                      signal.classification as SignalClassification
                    ] ?? signal.classification}
                  </Badge>
                </TableCell>
                <TableCell
                  className="py-2 text-xs text-muted-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  {signal.sourceId && onSourceClick ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (signal.sourceId) onSourceClick(signal.sourceId);
                      }}
                      className="hover:text-foreground hover:underline text-left"
                    >
                      {signal.sourceName ?? "—"}
                      {signal.sourceTier && (
                        <span className="ml-1 opacity-70">
                          ({TIER_LABELS[signal.sourceTier] ?? signal.sourceTier}
                          )
                        </span>
                      )}
                    </button>
                  ) : (
                    <>
                      {signal.sourceName ?? "—"}
                      {signal.sourceTier && (
                        <span className="ml-1 opacity-70">
                          ({TIER_LABELS[signal.sourceTier] ?? signal.sourceTier}
                          )
                        </span>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
