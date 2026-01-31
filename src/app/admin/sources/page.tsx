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

export default function AdminSourcesPage() {
  const {
    data: sources,
    error,
    isLoading,
    mutate,
  } = useSWR<SourceRow[]>("/api/admin/sources", fetcher);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<
    "enable" | "disable" | "change_tier"
  >("enable");
  const [bulkTier, setBulkTier] = useState<string>("TIER_1");
  const [bulkLoading, setBulkLoading] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Source Registry</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            Refresh
          </Button>
          <Button asChild>
            <Link href="/admin/sources/new">Add Source</Link>
          </Button>
        </div>
      </div>

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
    </div>
  );
}
