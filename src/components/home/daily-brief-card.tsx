"use client";

import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import type { DailyBrief, BriefItem, BriefDirection } from "@/lib/brief/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatUpdatedAt(generatedAt: string | null): string {
  if (!generatedAt) return "Not yet updated";
  const ms = Date.now() - new Date(generatedAt).getTime();
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  if (days >= 1) return `Updated ${days} day${days > 1 ? "s" : ""} ago`;
  if (hours >= 1) return `Updated ${hours} hour${hours > 1 ? "s" : ""} ago`;
  const mins = Math.floor(ms / (60 * 1000));
  if (mins >= 1) return `Updated ${mins} min${mins > 1 ? "s" : ""} ago`;
  return "Just updated";
}

function DirectionIcon({ direction }: { direction: BriefDirection }) {
  if (direction === "up")
    return (
      <ArrowUp className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden />
    );
  if (direction === "down")
    return <ArrowDown className="h-4 w-4 text-red-500 shrink-0" aria-hidden />;
  return (
    <Minus className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
  );
}

function BriefItemRow({
  item,
  defaultOpen = false,
}: {
  item: BriefItem;
  defaultOpen?: boolean;
}) {
  const hasDetails = Boolean(item.claimSummary || item.url);
  const deltaStr =
    item.direction !== "stable"
      ? `${item.delta > 0 ? "+" : ""}${(item.delta * 100).toFixed(2)}%`
      : null;

  if (!hasDetails) {
    return (
      <li className="flex items-center gap-2 text-sm py-1">
        <DirectionIcon direction={item.direction} />
        <span>
          <span className="font-medium">{item.axisLabel}</span>
          {deltaStr && (
            <span className="text-muted-foreground ml-1">{deltaStr}</span>
          )}
          <span className="text-muted-foreground text-xs ml-1">
            ({item.source})
          </span>
          <span
            className="text-muted-foreground text-xs ml-1"
            title="Confidence"
          >
            {Math.round(item.confidence * 100)}%
          </span>
        </span>
      </li>
    );
  }

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <li className="py-1">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm w-full text-left rounded-md hover:bg-muted/50 px-1 py-0.5 -mx-1"
            aria-expanded={defaultOpen}
          >
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground data-[state=open]:rotate-90 transition-transform" />
            <DirectionIcon direction={item.direction} />
            <span className="flex-1">
              <span className="font-medium">{item.axisLabel}</span>
              {deltaStr && (
                <span className="text-muted-foreground ml-1">{deltaStr}</span>
              )}
              <span className="text-muted-foreground text-xs ml-1">
                ({item.source})
              </span>
              <span
                className="text-muted-foreground text-xs ml-1"
                title="Confidence"
              >
                {Math.round(item.confidence * 100)}%
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pl-6 pr-2 py-2 text-sm text-muted-foreground border-l-2 border-muted ml-2 space-y-1">
            {item.claimSummary && (
              <p className="text-foreground/90">{item.claimSummary}</p>
            )}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Source <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </CollapsibleContent>
      </li>
    </Collapsible>
  );
}

export function DailyBriefCard({ className = "" }: { className?: string }) {
  const { data, error } = useSWR<{ brief: DailyBrief; isExact: boolean }>(
    "/api/brief/today",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );

  const brief = data?.brief ?? null;
  const isExact = data?.isExact ?? true;
  const movements = brief?.movements ?? [];
  const generatedAt = brief?.generatedAt ?? null;
  const coverageScore = brief?.coverageScore ?? null;
  const signalsProcessed = brief?.signalsProcessed ?? 0;
  const sourcesChecked = brief?.sourcesChecked ?? 0;
  const resolvedDate =
    brief?.resolvedDate ?? new Date().toISOString().slice(0, 10);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Today&apos;s Movement
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {formatUpdatedAt(generatedAt)}
          </span>
        </div>
        {!isExact && generatedAt && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Last updated: previous day (no snapshot for today yet).
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive">Failed to load brief.</p>
        )}
        {!error && !brief && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {!error && brief && (
          <>
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No significant changes.
              </p>
            ) : (
              <ul className="space-y-0">
                {movements.map((item, i) => (
                  <BriefItemRow
                    key={`${item.axis}-${item.signalId || i}`}
                    item={item}
                    defaultOpen={false}
                  />
                ))}
              </ul>
            )}
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pt-2 border-t">
              <span title="Sources checked">Sources: {sourcesChecked}</span>
              <span title="Signals extracted">Signals: {signalsProcessed}</span>
              <span title="Coverage score">
                Coverage:{" "}
                {coverageScore != null
                  ? `${Math.round(coverageScore * 100)}%`
                  : "—"}
              </span>
            </div>
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={`/news?date=${resolvedDate}`}>View all → News</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
