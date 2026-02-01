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
  const { data: statsData } = useSWR<{ sourceCount: number }>(
    "/api/stats",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );
  const { data: autonomyData } = useSWR<{
    level: number;
    levelLabel: string;
    uncertainty: number;
    insufficientData: boolean;
  }>("/api/autonomy/current", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  });

  const snapshot = snapshotData?.snapshot ?? null;
  const history = historyData?.history ?? [];
  const canaries = canariesData?.canaries ?? [];
  const events = timelineData?.events ?? [];
  const sourceCount = statsData?.sourceCount ?? 0;
  const autonomy =
    autonomyData != null
      ? {
          level: autonomyData.level,
          levelLabel: autonomyData.levelLabel,
          uncertainty: autonomyData.uncertainty,
          insufficientData: autonomyData.insufficientData,
        }
      : {
          level: 0.35,
          levelLabel: "Scripted agent (Level 1)",
          uncertainty: 0.3,
          insufficientData: true,
        };

  useCanaryFilterUrlSync();

  const hasNoData = !snapshot && canaries.length === 0 && events.length === 0;

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

      {(canaries.length > 0 || snapshot != null || sourceCount > 0) && (
        <CanaryStrip
          canaries={canaries}
          status={{
            lastUpdate: snapshot?.createdAt ?? null,
            sourceCount,
            coveragePercent: snapshot?.coverageScore ?? null,
            isStale:
              snapshot?.createdAt != null
                ? Date.now() - new Date(snapshot.createdAt).getTime() >
                  24 * 60 * 60 * 1000
                : false,
          }}
        />
      )}

      {!hasNoData && (
        <>
          {/* Primary row: Movement (left) + Autonomy (right); equal weight; both visible on mobile (stacked) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <DailyBriefCard axesToShow={highlightAxes ?? undefined} />
            <AutonomyThermometer
              level={autonomy.level}
              uncertainty={autonomy.uncertainty}
              levelLabel={autonomy.levelLabel}
              insufficientData={autonomy.insufficientData}
            />
          </div>
          {/* Context row: Timeline full width */}
          <TimelinePreview events={events} />
        </>
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
