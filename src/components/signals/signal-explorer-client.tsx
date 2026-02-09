"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SignalFilters } from "./signal-filters";
import type { SignalFiltersState } from "./signal-filters";
import { SignalListTable } from "./signal-list-table";
import { SignalDetailSheet } from "./signal-detail-sheet";
import { DesktopRedirectBanner } from "@/components/layout/desktop-redirect-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import type {
  SignalExplorerItem,
  SignalClassification,
} from "@/lib/signals/types";
import {
  AXIS_LABELS,
  CLASSIFICATION_LABELS,
  CLASSIFICATION_COLORS,
} from "@/lib/signals/types";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function buildSignalsUrl(filters: SignalFiltersState): string {
  const params = new URLSearchParams();
  if (filters.axes.size > 0) {
    params.set("axes", [...filters.axes].join(","));
  }
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.sourceTier) params.set("sourceTier", filters.sourceTier);
  if (filters.sourceId) params.set("sourceId", filters.sourceId);
  if (filters.confidenceMin > 0) {
    params.set("confidenceMin", String(filters.confidenceMin));
  }
  if (filters.hasBenchmark === true) params.set("hasBenchmark", "true");
  if (filters.hasBenchmark === false) params.set("hasBenchmark", "false");
  if (filters.q) params.set("q", filters.q);
  params.set("limit", "200");
  return `/api/signals?${params.toString()}`;
}

function filtersFromUrl(searchParams: URLSearchParams): SignalFiltersState {
  const axesParam = searchParams.get("axes");
  const axes = new Set(axesParam ? axesParam.split(",").filter(Boolean) : []);
  return {
    axes,
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    sourceTier: searchParams.get("sourceTier"),
    sourceId: searchParams.get("sourceId"),
    confidenceMin:
      Number.parseFloat(searchParams.get("confidenceMin") ?? "0") || 0,
    hasBenchmark:
      searchParams.get("hasBenchmark") === "true"
        ? true
        : searchParams.get("hasBenchmark") === "false"
          ? false
          : null,
    highConfidenceOnly:
      Number.parseFloat(searchParams.get("confidenceMin") ?? "0") >= 0.7,
    q: searchParams.get("q") ?? "",
  };
}

function filtersToUrlParams(filters: SignalFiltersState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.axes.size > 0) {
    params.set("axes", [...filters.axes].join(","));
  }
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.sourceTier) params.set("sourceTier", filters.sourceTier);
  if (filters.sourceId) params.set("sourceId", filters.sourceId);
  if (filters.confidenceMin > 0) {
    params.set("confidenceMin", String(filters.confidenceMin));
  }
  if (filters.hasBenchmark === true) params.set("hasBenchmark", "true");
  if (filters.hasBenchmark === false) params.set("hasBenchmark", "false");
  if (filters.q) params.set("q", filters.q);
  return params;
}

export function SignalExplorerClient() {
  const searchParams = useSearchParams();
  const signalFromUrl = searchParams.get("signal");

  const [filters, setFilters] = useState<SignalFiltersState>(() =>
    filtersFromUrl(searchParams),
  );
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(
    signalFromUrl,
  );
  const [sheetOpen, setSheetOpen] = useState(!!signalFromUrl);

  useEffect(() => {
    setFilters(filtersFromUrl(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (signalFromUrl && signalFromUrl !== selectedSignalId) {
      setSelectedSignalId(signalFromUrl);
      setSheetOpen(true);
    }
  }, [signalFromUrl, selectedSignalId]);

  const signalsUrl = useMemo(() => buildSignalsUrl(filters), [filters]);

  const { data, error, isLoading } = useSWR<{
    signals: SignalExplorerItem[];
  }>(signalsUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30 * 1000,
  });

  const signals = data?.signals ?? [];

  const handleFiltersChange = useCallback((next: SignalFiltersState) => {
    setFilters(next);
    const params = filtersToUrlParams(next);
    const url = new URL(window.location.href);
    url.search = params.toString();
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleRowClick = useCallback((signal: SignalExplorerItem) => {
    setSelectedSignalId(signal.id);
    setSheetOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.set("signal", signal.id);
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("signal");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleExportCsv = useCallback(() => {
    const params = filtersToUrlParams(filters);
    params.set("format", "csv");
    params.set("limit", "10000");
    window.open(`/api/signals/export?${params.toString()}`, "_blank");
  }, [filters]);

  const handleExportJson = useCallback(() => {
    const params = filtersToUrlParams(filters);
    params.set("format", "json");
    params.set("limit", "10000");
    window.open(`/api/signals/export?${params.toString()}`, "_blank");
  }, [filters]);

  const handleSourceClick = useCallback(
    (sourceId: string) => {
      handleFiltersChange({ ...filters, sourceId });
    },
    [filters, handleFiltersChange],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Signal Explorer</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Explore and audit the evidence behind every metric. Filter by
              axis, source, confidence, and export for verification.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Control Room
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Filter & search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SignalFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          </CardContent>
        </Card>

        {/* Aggregate summary bar */}
        {!isLoading && signals.length > 0 && (
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Classification distribution */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    By Classification
                  </p>
                  <div className="space-y-1">
                    {Object.entries(
                      signals.reduce(
                        (acc, s) => {
                          const cls = s.classification as SignalClassification;
                          acc[cls] = (acc[cls] ?? 0) + 1;
                          return acc;
                        },
                        {} as Record<string, number>,
                      ),
                    )
                      .sort(([, a], [, b]) => b - a)
                      .map(([cls, count]) => (
                        <div
                          key={cls}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded border text-[10px]",
                              CLASSIFICATION_COLORS[
                                cls as SignalClassification
                              ] ?? CLASSIFICATION_COLORS.other,
                            )}
                          >
                            {CLASSIFICATION_LABELS[
                              cls as SignalClassification
                            ] ?? cls}
                          </span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Axis distribution */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    By Axis
                  </p>
                  <div className="space-y-1">
                    {Object.entries(
                      signals.reduce(
                        (acc, s) => {
                          for (const a of s.axesImpacted ?? []) {
                            acc[a.axis] = (acc[a.axis] ?? 0) + 1;
                          }
                          return acc;
                        },
                        {} as Record<string, number>,
                      ),
                    )
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 6)
                      .map(([axis, count]) => (
                        <div
                          key={axis}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="font-medium w-20 truncate">
                            {AXIS_LABELS[axis] ?? axis}
                          </span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/60 rounded-full"
                              style={{
                                width: `${Math.min(100, (count / signals.length) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-muted-foreground w-6 text-right">
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Confidence distribution */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Confidence Distribution
                  </p>
                  <div className="space-y-1">
                    {[
                      {
                        label: "High (≥80%)",
                        count: signals.filter((s) => s.confidence >= 0.8)
                          .length,
                        color: "bg-emerald-500",
                      },
                      {
                        label: "Medium (50-79%)",
                        count: signals.filter(
                          (s) => s.confidence >= 0.5 && s.confidence < 0.8,
                        ).length,
                        color: "bg-amber-500",
                      },
                      {
                        label: "Low (<50%)",
                        count: signals.filter((s) => s.confidence < 0.5).length,
                        color: "bg-red-500",
                      },
                    ].map((bucket) => (
                      <div
                        key={bucket.label}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            bucket.color,
                          )}
                        />
                        <span className="flex-1">{bucket.label}</span>
                        <span className="text-muted-foreground">
                          {bucket.count}
                        </span>
                      </div>
                    ))}
                    {/* Source diversity */}
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground">
                        Sources:{" "}
                        {
                          new Set(
                            signals.map((s) => s.sourceName).filter(Boolean),
                          ).size
                        }{" "}
                        unique
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading…"
              : error
                ? "Failed to load signals"
                : `${signals.length} signal${signals.length === 1 ? "" : "s"}`}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCsv}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJson}>
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <SignalListTable
          signals={signals}
          onRowClick={handleRowClick}
          onSourceClick={handleSourceClick}
          isLoading={isLoading}
        />

        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              Click a row to view full signal details, citations, and source
              link. Use filters to narrow by capability axis, source tier, or
              confidence. Export filtered results as CSV or JSON for external
              analysis.
            </p>
          </CardContent>
        </Card>

        <DesktopRedirectBanner />
      </div>

      <SignalDetailSheet
        signalId={selectedSignalId}
        open={sheetOpen}
        onOpenChange={(open) => !open && handleSheetClose()}
      />
    </div>
  );
}
