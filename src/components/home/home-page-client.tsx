"use client";

import useSWR from "swr";
import Link from "next/link";
import { CanaryStrip } from "./canary-strip";
import { CapabilityRadar } from "./capability-radar";
import { AutonomyThermometer } from "./autonomy-thermometer";
import { DailyBriefCard } from "./daily-brief-card";
import { TimelinePreview } from "./timeline-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import type {
  Snapshot,
  SnapshotHistoryEntry,
  Canary,
  TimelineEvent,
} from "@/lib/home/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
    "/api/timeline/recent?limit=10",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );
  const snapshot = snapshotData?.snapshot ?? null;
  const history = historyData?.history ?? [];
  const canaries = canariesData?.canaries ?? [];
  const events = timelineData?.events ?? [];

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
  const radarSize = isMobile ? 280 : 360;
  const showGhosts = !isMobile;

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

      {canaries.length > 0 && <CanaryStrip canaries={canaries} />}

      {/* Mobile: single column; Desktop: radar + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Capability Radar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <CapabilityRadar
                  snapshot={snapshot}
                  history={showGhosts ? history : []}
                  size={radarSize}
                />
              </div>
            </CardContent>
          </Card>
          <TimelinePreview events={events} />
        </div>
        <div className="space-y-6 hidden lg:block">
          <AutonomyThermometer level={autonomyLevel} />
          <DailyBriefCard />
        </div>
      </div>

      {/* Mobile: brief below radar (thermometer available via Autonomy tab); desktop: thermometer + brief in sidebar */}
      <div className="space-y-6 lg:hidden">
        <DailyBriefCard />
      </div>

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
