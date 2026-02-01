"use client";

import { useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { CanaryStrip } from "./canary-strip";
import { AutonomyThermometer } from "./autonomy-thermometer";
import { DailyBriefCard } from "./daily-brief-card";
import { TimelinePreview } from "./timeline-preview";
import { HeroSection } from "./hero-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHomeStore } from "@/lib/home/store";
import type {
  Snapshot,
  SnapshotHistoryEntry,
  Canary,
  TimelineEvent,
} from "@/lib/home/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Sync URL ?filter= with store (both directions). */
function useCanaryFilterUrlSync() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeCanaryFilter = useHomeStore((s) => s.activeCanaryFilter);
  const setCanaryFilter = useHomeStore((s) => s.setCanaryFilter);

  useEffect(() => {
    const filter = searchParams.get("filter");
    setCanaryFilter(filter ?? null);
  }, [searchParams, setCanaryFilter]);

  useEffect(() => {
    const current = searchParams.get("filter");
    if (current === activeCanaryFilter) return;
    const path = activeCanaryFilter
      ? `/?filter=${encodeURIComponent(activeCanaryFilter)}`
      : "/";
    router.replace(path, { scroll: false });
  }, [activeCanaryFilter, router, searchParams]);
}

export function HomePageClient() {
  const { data: snapshotData } = useSWR<{ snapshot: Snapshot | null }>(
    "/api/snapshot/latest",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );
  const { data: historyData } = useSWR<{ history: SnapshotHistoryEntry[] }>(
    "/api/snapshot/history?days=90",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );
  const { data: canariesData } = useSWR<{ canaries: Canary[] }>(
    "/api/canaries",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );
  const { data: timelineData } = useSWR<{ events: TimelineEvent[] }>(
    "/api/timeline/recent?limit=6",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );

  const snapshot = snapshotData?.snapshot ?? null;
  const history = historyData?.history ?? [];
  const canaries = canariesData?.canaries ?? [];
  const events = timelineData?.events ?? [];

  useCanaryFilterUrlSync();

  const hasNoData = !snapshot && canaries.length === 0 && events.length === 0;

  const autonomyLevel = (() => {
    if (!snapshot?.axisScores) return 0.35;
    const planning = snapshot.axisScores.planning?.score;
    const toolUse = snapshot.axisScores.tool_use?.score;
    if (planning == null && toolUse == null) return 0.35;
    const p = planning != null ? (Number(planning) + 1) / 2 : 0.5;
    const t = toolUse != null ? (Number(toolUse) + 1) / 2 : 0.5;
    return (p + t) / 2;
  })();

  const isMobile = useIsMobile();
  const heroRadarSize = isMobile ? 320 : 500;
  const showGhosts = !isMobile;

  const activeCanaryFilter = useHomeStore((s) => s.activeCanaryFilter);
  const highlightAxes =
    activeCanaryFilter && canaries.length > 0
      ? (canaries.find((c) => c.id === activeCanaryFilter)?.axesWatched ?? [])
      : undefined;

  return (
    <div className="space-y-6 sm:space-y-8">
      {hasNoData && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Awaiting first data run</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              The pipeline has not run yet. Configure sources and trigger
              discovery to populate the control room.
            </p>
            <Button asChild>
              <Link href="/admin/sources">Go to Admin</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!hasNoData && (
        <HeroSection
          snapshot={snapshot}
          history={history}
          radarSize={heroRadarSize}
          showGhosts={showGhosts}
          highlightAxes={highlightAxes}
        />
      )}

      {canaries.length > 0 && <CanaryStrip canaries={canaries} />}

      {!hasNoData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            <TimelinePreview events={events} />
          </div>
          <div className="space-y-6 hidden lg:block">
            <AutonomyThermometer level={autonomyLevel} />
            <DailyBriefCard axesToShow={highlightAxes ?? undefined} />
          </div>
        </div>
      )}

      {!hasNoData && (
        <div className="space-y-6 lg:hidden">
          <DailyBriefCard axesToShow={highlightAxes ?? undefined} />
        </div>
      )}

      <p className="text-center sm:hidden pt-2">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 min-h-[44px] min-w-[44px] justify-center"
          aria-label="View on desktop for full analysis"
        >
          Full instrument →
        </Link>
      </p>
    </div>
  );
}
