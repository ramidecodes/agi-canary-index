/**
 * Admin pipeline controls: manual triggers for each pipeline step.
 * @see docs/features/15-admin-pipeline-controls.md
 */

"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type DiscoverResult = {
  ok: boolean;
  dryRun?: boolean;
  itemsDiscovered?: number;
  itemsInserted?: number;
  sourcesSucceeded?: number;
  sourcesFailed?: number;
  durationMs?: number;
  skipped?: boolean;
  skipReason?: string;
};

type AcquireResult = {
  ok: boolean;
  itemsProcessed?: number;
  itemsAcquired?: number;
  itemsFailed?: number;
  durationMs?: number;
};

type ProcessResult = {
  ok: boolean;
  documentsProcessed?: number;
  documentsFailed?: number;
  signalsCreated?: number;
  durationMs?: number;
};

type SnapshotResult = {
  ok: boolean;
  date?: string;
  signalCount?: number;
  created?: boolean;
};

function PipelineStepCard({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {step}. {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export default function AdminPipelinePage() {
  const [discoverDryRun, setDiscoverDryRun] = useState(false);
  const [snapshotDate, setSnapshotDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [acquireLoading, setAcquireLoading] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<DiscoverResult | null>(
    null,
  );
  const [acquireResult, setAcquireResult] = useState<AcquireResult | null>(
    null,
  );
  const [processResult, setProcessResult] = useState<ProcessResult | null>(
    null,
  );
  const [snapshotResult, setSnapshotResult] = useState<SnapshotResult | null>(
    null,
  );

  // Fetch job queue status
  const { data: jobStatus, mutate: refreshJobStatus } = useSWR(
    "/api/admin/jobs",
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch job status");
      return res.json();
    },
    { refreshInterval: 5000 },
  );

  const handleDiscover = useCallback(async () => {
    setDiscoverLoading(true);
    setDiscoverResult(null);
    try {
      const res = await fetch("/api/admin/pipeline/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: discoverDryRun }),
      });
      const data = (await res.json()) as DiscoverResult & { error?: string };
      setDiscoverResult(data);
      if (res.ok) {
        if (data.skipped && data.skipReason === "run_already_in_progress") {
          toast.warning(
            "Discovery skipped: a run is already in progress. Click again to force a new run.",
          );
        } else {
          const msg = discoverDryRun
            ? `Dry run: ${data.itemsDiscovered ?? 0} items discovered`
            : `${data.itemsInserted ?? 0} items inserted, ${
                data.sourcesSucceeded ?? 0
              } sources succeeded`;
          toast.success(msg);
        }
      } else {
        toast.error(data.error ?? "Discovery failed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Discovery failed");
    } finally {
      setDiscoverLoading(false);
    }
  }, [discoverDryRun]);

  const handleAcquire = useCallback(async () => {
    setAcquireLoading(true);
    setAcquireResult(null);
    try {
      const res = await fetch("/api/admin/pipeline/acquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as AcquireResult & { error?: string };
      setAcquireResult(data);
      if (res.ok) {
        toast.success(
          `${data.itemsAcquired ?? 0} documents acquired (${
            data.itemsProcessed ?? 0
          } processed)`,
        );
      } else {
        toast.error(data.error ?? "Acquisition failed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Acquisition failed");
    } finally {
      setAcquireLoading(false);
    }
  }, []);

  const handleProcess = useCallback(async () => {
    setProcessLoading(true);
    setProcessResult(null);
    try {
      const res = await fetch("/api/admin/pipeline/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as ProcessResult & { error?: string };
      setProcessResult(data);
      if (res.ok) {
        toast.success(
          `${data.documentsProcessed ?? 0} docs processed, ${
            data.signalsCreated ?? 0
          } signals created`,
        );
      } else {
        toast.error(data.error ?? "Signal processing failed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signal processing failed");
    } finally {
      setProcessLoading(false);
    }
  }, []);

  const handleSnapshot = useCallback(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate)) {
      toast.error("Invalid date; use YYYY-MM-DD");
      return;
    }
    setSnapshotLoading(true);
    setSnapshotResult(null);
    try {
      const res = await fetch("/api/admin/pipeline/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: snapshotDate }),
      });
      const data = (await res.json()) as SnapshotResult & { error?: string };
      setSnapshotResult(data);
      if (res.ok) {
        toast.success(
          `${data.signalCount ?? 0} signals aggregated${
            data.created ? ", snapshot created" : ""
          }`,
        );
      } else {
        toast.error(data.error ?? "Snapshot creation failed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Snapshot creation failed");
    } finally {
      setSnapshotLoading(false);
    }
  }, [snapshotDate]);

  const handleKickRunner = useCallback(async () => {
    try {
      // Proxy through Next.js API to keep INTERNAL_TOKEN server-side
      const res = await fetch("/api/admin/worker/kick", {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(
          `Runner kicked: ${data.processed} processed, ${data.remaining} remaining`,
        );
        refreshJobStatus();
      } else {
        toast.error(data.error || "Failed to kick runner");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to kick runner");
    }
  }, [refreshJobStatus]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Pipeline Controls</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manually trigger each stage of the data pipeline.
        </p>
      </div>

      {/* Job Queue Status Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Job Queue Status</CardTitle>
              <CardDescription>
                Current state of the ETL job queue
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refreshJobStatus();
                handleKickRunner();
              }}
            >
              Kick Runner
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {jobStatus ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Jobs by Status</h3>
                <div className="flex flex-wrap gap-2">
                  {jobStatus.statusCounts?.map(
                    (s: { status: string; count: string }) => (
                      <Badge key={s.status} variant="outline">
                        {s.status}: {s.count}
                      </Badge>
                    ),
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Jobs by Type</h3>
                <div className="flex flex-wrap gap-2">
                  {jobStatus.typeCounts?.map(
                    (t: { type: string; count: string }) => (
                      <Badge key={t.type} variant="secondary">
                        {t.type}: {t.count}
                      </Badge>
                    ),
                  )}
                </div>
              </div>
              {jobStatus.activeRuns && jobStatus.activeRuns.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Active Runs</h3>
                  <div className="text-muted-foreground text-sm">
                    {jobStatus.activeRuns.length} running pipeline run(s)
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Loading job status...
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <PipelineStepCard
          step={1}
          title="Discovery"
          description="Fetch URLs from RSS, search, curated sources."
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="discover-dry-run"
                checked={discoverDryRun}
                onCheckedChange={(v) => setDiscoverDryRun(v === true)}
              />
              <Label htmlFor="discover-dry-run" className="text-sm font-normal">
                Dry run (no DB writes)
              </Label>
            </div>
            <Button onClick={handleDiscover} disabled={discoverLoading}>
              {discoverLoading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Running…
                </>
              ) : (
                "Run Discovery"
              )}
            </Button>
          </div>
          {discoverResult && (
            <p className="text-muted-foreground text-sm">
              {discoverResult.ok
                ? discoverResult.skipped &&
                  discoverResult.skipReason === "run_already_in_progress"
                  ? "Discovery skipped: a run is already in progress. Click again to force a new run."
                  : `${discoverResult.itemsInserted ?? 0} items inserted, ${
                      discoverResult.sourcesSucceeded ?? 0
                    } sources succeeded${
                      discoverResult.sourcesFailed
                        ? `, ${discoverResult.sourcesFailed} failed`
                        : ""
                    }${
                      discoverResult.durationMs
                        ? ` (${(discoverResult.durationMs / 1000).toFixed(1)}s)`
                        : ""
                    }`
                : null}
            </p>
          )}
        </PipelineStepCard>

        <PipelineStepCard
          step={2}
          title="Acquisition"
          description="Scrape content via Firecrawl, store in R2."
        >
          <Button onClick={handleAcquire} disabled={acquireLoading}>
            {acquireLoading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Running…
              </>
            ) : (
              "Run Acquisition"
            )}
          </Button>
          {acquireResult && (
            <p className="text-muted-foreground text-sm">
              {acquireResult.ok
                ? `${acquireResult.itemsAcquired ?? 0} documents acquired (${
                    acquireResult.itemsProcessed ?? 0
                  } processed)${
                    acquireResult.durationMs
                      ? ` (${(acquireResult.durationMs / 1000).toFixed(1)}s)`
                      : ""
                  }`
                : null}
            </p>
          )}
        </PipelineStepCard>

        <PipelineStepCard
          step={3}
          title="Signal Processing"
          description="AI extraction → create signals."
        >
          <Button onClick={handleProcess} disabled={processLoading}>
            {processLoading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Running…
              </>
            ) : (
              "Run Processing"
            )}
          </Button>
          {processResult && (
            <p className="text-muted-foreground text-sm">
              {processResult.ok
                ? `${processResult.documentsProcessed ?? 0} docs processed, ${
                    processResult.signalsCreated ?? 0
                  } signals created${
                    processResult.documentsFailed
                      ? `, ${processResult.documentsFailed} failed`
                      : ""
                  }${
                    processResult.durationMs
                      ? ` (${(processResult.durationMs / 1000).toFixed(1)}s)`
                      : ""
                  }`
                : null}
            </p>
          )}
        </PipelineStepCard>

        <PipelineStepCard
          step={4}
          title="Snapshot"
          description="Aggregate signals into daily snapshot."
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="snapshot-date" className="text-sm">
                Date
              </Label>
              <Input
                id="snapshot-date"
                type="date"
                value={snapshotDate}
                onChange={(e) => setSnapshotDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSnapshot} disabled={snapshotLoading}>
                {snapshotLoading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Running…
                  </>
                ) : (
                  "Run Snapshot"
                )}
              </Button>
            </div>
          </div>
          {snapshotResult && (
            <p className="text-muted-foreground text-sm">
              {snapshotResult.ok
                ? `${snapshotResult.signalCount ?? 0} signals aggregated${
                    snapshotResult.created ? ", snapshot created" : ""
                  }`
                : null}
            </p>
          )}
        </PipelineStepCard>
      </div>
    </div>
  );
}
