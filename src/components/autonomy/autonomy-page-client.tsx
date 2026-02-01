"use client";

import useSWR from "swr";
import Link from "next/link";
import { AutonomyGauge } from "./autonomy-gauge";
import { RiskCanariesPanel } from "./risk-canaries-panel";
import { TriggerLog, type Trigger } from "./trigger-log";
import {
  EvaluationCoverageMeter,
  type CoverageBreakdown,
} from "./evaluation-coverage-meter";
import { HistoricalAutonomyChart } from "./historical-autonomy-chart";
import { InterpretationGuide } from "./interpretation-guide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeFooter } from "@/components/home/home-footer";
import type { Canary } from "@/lib/home/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AutonomyPageClient() {
  const { data: currentData } = useSWR<{
    level: number;
    levelIndex: number;
    levelLabel: string;
    uncertainty: number;
    insufficientData: boolean;
    lastUpdated: string | null;
  }>("/api/autonomy/current", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  });

  const { data: canariesData } = useSWR<{ canaries: Canary[] }>(
    "/api/canaries?type=risk",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );

  const { data: triggersData } = useSWR<{ triggers: Trigger[] }>(
    "/api/signals/recent?axes=tool_use,planning,alignment_safety&limit=15",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );

  const { data: coverageData } = useSWR<{
    overallCoverage: number;
    gapCount: number;
    breakdown: CoverageBreakdown[];
    lastUpdated: string | null;
  }>("/api/autonomy/coverage", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  });

  const { data: historyData } = useSWR<{
    history: Array<{ date: string; level: number; low: number; high: number }>;
  }>("/api/autonomy/history?days=90", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  });

  const level = currentData?.level ?? 0.35;
  const uncertainty = currentData?.uncertainty ?? 0.2;
  const insufficientData = currentData?.insufficientData ?? false;
  const lastUpdated = currentData?.lastUpdated ?? null;
  const levelLabel = currentData?.levelLabel ?? "Scripted agent (Level 1)";

  const canaries = canariesData?.canaries ?? [];
  const triggers = triggersData?.triggers ?? [];
  const coverage = coverageData ?? {
    overallCoverage: 40,
    gapCount: 2,
    breakdown: [],
    lastUpdated: null,
  };
  const history = historyData?.history ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Page header */}
        <header className="space-y-1">
          <nav className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span>Autonomy & Risk</span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight">
            Autonomy & Risk
          </h1>
          <p className="text-muted-foreground">
            Long-horizon agency indicators. Factual, not speculative.
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </header>

        {/* Primary layout: gauge + canaries side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  Autonomy scale
                </CardTitle>
                <p className="text-sm text-muted-foreground">{levelLabel}</p>
              </CardHeader>
              <CardContent>
                <AutonomyGauge
                  level={level}
                  uncertainty={uncertainty}
                  insufficientData={insufficientData}
                  size={240}
                />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <RiskCanariesPanel canaries={canaries} />
          </div>
        </div>

        {/* Trigger log */}
        <TriggerLog triggers={triggers} />

        {/* Coverage meter + Historical chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <EvaluationCoverageMeter
            overallCoverage={coverage.overallCoverage}
            gapCount={coverage.gapCount}
            breakdown={coverage.breakdown}
            lastUpdated={coverage.lastUpdated}
          />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Historical autonomy
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Autonomy level over time with confidence bands
              </p>
            </CardHeader>
            <CardContent>
              <HistoricalAutonomyChart history={history} />
            </CardContent>
          </Card>
        </div>

        {/* Interpretation guide */}
        <InterpretationGuide />

        <HomeFooter />
      </div>
    </div>
  );
}
