/**
 * Admin sources list: health status, bulk actions, add source.
 * @see docs/features/02-source-registry.md
 */

"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSourceHealthStatus } from "@/lib/sources";

type SourceRow = {
  id: string;
  name: string;
  url: string;
  tier: string;
  trustWeight: string;
  cadence: string;
  domainType: string;
  sourceType: string;
  isActive: boolean;
  lastSuccessAt: string | null;
  errorCount: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function StatusBadge({
  lastSuccessAt,
  errorCount,
}: {
  lastSuccessAt: string | null;
  errorCount: number;
}) {
  const status = getSourceHealthStatus({
    lastSuccessAt: lastSuccessAt ? new Date(lastSuccessAt) : null,
    errorCount,
  });
  const label =
    status === "green" ? "OK" : status === "yellow" ? "Degraded" : "Error";
  const variant =
    status === "green"
      ? "default"
      : status === "yellow"
        ? "secondary"
        : "destructive";

  return (
    <Badge
      variant={variant}
      className={
        status === "green"
          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
          : status === "yellow"
            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
            : undefined
      }
      title={
        lastSuccessAt
          ? `Last success: ${new Date(lastSuccessAt).toISOString()}`
          : "Never fetched"
      }
    >
      {label}
    </Badge>
  );
}

const TIER_OPTIONS = ["TIER_0", "TIER_1", "DISCOVERY"] as const;

type HealthReport = {
  summary: {
    total: number;
    active: number;
    green: number;
    yellow: number;
    red: number;
    healthScore: number;
  };
  suggestions: string[];
};

export default function AdminSourcesPage() {
  const {
    data: sources,
    error,
    isLoading,
    mutate,
  } = useSWR<SourceRow[]>("/api/admin/sources", fetcher);
  const {
    data: healthReport,
    mutate: mutateHealth,
  } = useSWR<HealthReport>("/api/admin/sources/health-report", fetcher);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<
    "enable" | "disable" | "change_tier"
  >("enable");
  const [bulkTier, setBulkTier] = useState<string>("TIER_1");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [candidates, setCandidates] = useState<
    Array<{
      name: string;
      url: string;
      feedUrl?: string;
      description: string;
      domainType: string;
      sourceType: string;
      suggestedTier: string;
      rationale: string;
    }>
  >([]);
  const [addingSource, setAddingSource] = useState<string | null>(null);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!sources?.length) return;
    if (selected.size === sources.length) setSelected(new Set());
    else setSelected(new Set(sources.map((s) => s.id)));
  }, [sources, selected.size]);

  const runBulk = useCallback(async () => {
    if (selected.size === 0) {
      toast.error("Select at least one source");
      return;
    }
    if (bulkAction === "change_tier" && !bulkTier) {
      toast.error("Select a tier");
      return;
    }
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/sources/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceIds: Array.from(selected),
          action: bulkAction,
          ...(bulkAction === "change_tier" && { tier: bulkTier }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bulk action failed");
      toast.success(`Updated ${data.updated} source(s)`);
      setSelected(new Set());
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk action failed");
    } finally {
      setBulkLoading(false);
    }
  }, [selected, bulkAction, bulkTier, mutate]);

  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    try {
      const res = await fetch("/api/admin/sources/validate", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Validation failed");
      toast.success(
        `Validated ${data.validated} sources: ${data.passing} passing, ${data.failing} failing${data.autoDisabled > 0 ? `, ${data.autoDisabled} auto-disabled` : ""}`,
      );
      mutate();
      mutateHealth();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setIsValidating(false);
    }
  }, [mutate, mutateHealth]);

  const handleDiscover = useCallback(async () => {
    setIsDiscovering(true);
    try {
      const res = await fetch("/api/admin/sources/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Discovery failed");
      setCandidates(data.candidates ?? []);
      toast.success(
        `Found ${data.candidates?.length ?? 0} new source candidates (${data.filtered} duplicates filtered)`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Discovery failed");
    } finally {
      setIsDiscovering(false);
    }
  }, []);

  const handleAddCandidate = useCallback(
    async (candidate: (typeof candidates)[0]) => {
      setAddingSource(candidate.url);
      try {
        const res = await fetch("/api/admin/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: candidate.name,
            url: candidate.feedUrl || candidate.url,
            tier: candidate.suggestedTier,
            trustWeight: candidate.suggestedTier === "TIER_0" ? "0.85" : "0.5",
            cadence: "weekly",
            domainType: candidate.domainType,
            sourceType: candidate.sourceType,
            isActive: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to add source");
        toast.success(`Added "${candidate.name}" as a new source`);
        setCandidates((prev) => prev.filter((c) => c.url !== candidate.url));
        mutate();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to add source");
      } finally {
        setAddingSource(null);
      }
    },
    [mutate],
  );

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        Failed to load sources: {String(error)}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        Loading sources…
      </div>
    );
  }

  const summary = healthReport?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Source Registry</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleValidate}
            disabled={isValidating}
          >
            {isValidating ? "Validating..." : "Run Health Check"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            Refresh
          </Button>
          <Button asChild>
            <Link href="/admin/sources/new">Add Source</Link>
          </Button>
        </div>
      </div>

      {/* Health summary dashboard */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                Health Score
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <span
                className={`text-2xl font-bold tabular-nums ${
                  summary.healthScore >= 80
                    ? "text-emerald-600 dark:text-emerald-400"
                    : summary.healthScore >= 50
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-destructive"
                }`}
              >
                {summary.healthScore}%
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                Green
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {summary.green}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                / {summary.total}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                Yellow
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {summary.yellow}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                Red
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <span className="text-2xl font-bold text-destructive tabular-nums">
                {summary.red}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Suggestions */}
      {healthReport?.suggestions && healthReport.suggestions.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-1">
          <h3 className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Suggestions
          </h3>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {healthReport.suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
          </span>
          <Select
            value={bulkAction}
            onValueChange={(v) =>
              setBulkAction(v as "enable" | "disable" | "change_tier")
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enable">Enable</SelectItem>
              <SelectItem value="disable">Disable</SelectItem>
              <SelectItem value="change_tier">Change tier</SelectItem>
            </SelectContent>
          </Select>
          {bulkAction === "change_tier" && (
            <Select value={bulkTier} onValueChange={setBulkTier}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIER_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={runBulk} disabled={bulkLoading} size="sm">
            {bulkLoading ? "Applying…" : "Apply"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    sources?.length ? selected.size === sources.length : false
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Trust</TableHead>
              <TableHead>Cadence</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Last success</TableHead>
              <TableHead>Errors</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(sources ?? []).map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(s.id)}
                    onCheckedChange={() => toggleSelect(s.id)}
                    aria-label={`Select ${s.name}`}
                  />
                </TableCell>
                <TableCell>
                  <StatusBadge
                    lastSuccessAt={s.lastSuccessAt}
                    errorCount={s.errorCount}
                  />
                </TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {s.tier}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.trustWeight}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.cadence}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.sourceType}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.lastSuccessAt
                    ? new Date(s.lastSuccessAt).toLocaleString()
                    : "—"}
                </TableCell>
                <TableCell>
                  {s.errorCount > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      {s.errorCount}
                    </span>
                  ) : (
                    "0"
                  )}
                </TableCell>
                <TableCell>
                  {s.isActive ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Yes
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    asChild
                  >
                    <Link href={`/admin/sources/${s.id}/edit`}>Edit</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {sources?.length === 0 && (
        <p className="text-muted-foreground">
          No sources yet. Run{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
            pnpm run db:seed
          </code>{" "}
          or add one.
        </p>
      )}

      {/* Discover New Sources */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              Discover New Sources
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscover}
              disabled={isDiscovering}
            >
              {isDiscovering ? "Searching..." : "Find Sources"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Uses AI search to find new AI research blogs, RSS feeds, and
            publications. Duplicates are automatically filtered.
          </p>
        </CardHeader>
        {candidates.length > 0 && (
          <CardContent>
            <div className="space-y-3">
              {candidates.map((c) => (
                <div
                  key={c.url}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{c.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {c.suggestedTier}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {c.sourceType}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {c.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 italic">
                      {c.rationale}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate max-w-xs"
                      >
                        {c.url}
                      </a>
                      {c.feedUrl && c.feedUrl !== c.url && (
                        <a
                          href={c.feedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          (feed)
                        </a>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddCandidate(c)}
                    disabled={addingSource === c.url}
                    className="shrink-0"
                  >
                    {addingSource === c.url ? "Adding..." : "Add"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
