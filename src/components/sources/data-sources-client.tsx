"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  domainType: string;
  sourceType: string;
  cadence: string;
  trustWeight: string;
  lastSuccessAt: string | null;
  errorCount: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TIER_LABELS: Record<string, string> = {
  TIER_0: "Tier 0 (Authoritative)",
  TIER_1: "Tier 1 (Commentary)",
  DISCOVERY: "Discovery",
};

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
          ? `Last success: ${new Date(lastSuccessAt).toLocaleString()}`
          : "Never fetched"
      }
    >
      {label}
    </Badge>
  );
}

function SourcesTable({ sources }: { sources: SourceRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Status</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="hidden sm:table-cell">Domain</TableHead>
          <TableHead className="hidden sm:table-cell">Type</TableHead>
          <TableHead className="hidden md:table-cell">Cadence</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sources.map((s) => (
          <TableRow key={s.id}>
            <TableCell>
              <StatusBadge
                lastSuccessAt={s.lastSuccessAt}
                errorCount={s.errorCount}
              />
            </TableCell>
            <TableCell>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {s.name}
              </a>
            </TableCell>
            <TableCell className="hidden sm:table-cell text-muted-foreground capitalize">
              {s.domainType}
            </TableCell>
            <TableCell className="hidden sm:table-cell text-muted-foreground capitalize">
              {s.sourceType}
            </TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground capitalize">
              {s.cadence}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function DataSourcesClient() {
  const {
    data: sources,
    error,
    isLoading,
  } = useSWR<SourceRow[]>("/api/sources", fetcher);

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-6">
          <p className="text-destructive">
            Failed to load sources: {String(error)}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted/30 rounded animate-pulse" />
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="h-64 bg-muted/30 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!sources?.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No active sources configured.</p>
        </CardContent>
      </Card>
    );
  }

  const byTier = sources.reduce<Record<string, SourceRow[]>>((acc, s) => {
    if (!acc[s.tier]) acc[s.tier] = [];
    acc[s.tier].push(s);
    return acc;
  }, {});

  const tierOrder = ["TIER_0", "TIER_1", "DISCOVERY"];

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Trusted data sources</CardTitle>
          <CardDescription>
            Active sources feeding the pipeline. Tier 0: authoritative; Tier 1:
            commentary; Discovery: search-curated. Sources are checked according
            to their cadence.
          </CardDescription>
        </CardHeader>
      </Card>

      {tierOrder.map((tier) => {
        const tierSources = byTier[tier];
        if (!tierSources?.length) return null;
        return (
          <Card key={tier}>
            <CardHeader>
              <CardTitle className="text-lg">
                {TIER_LABELS[tier] ?? tier}
              </CardTitle>
              <CardDescription>
                {tierSources.length} source{tierSources.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-b-xl overflow-hidden border-t border-border">
                <SourcesTable sources={tierSources} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
