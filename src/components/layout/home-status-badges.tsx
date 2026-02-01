"use client";

import { usePathname } from "next/navigation";
import useSWR from "swr";
import { StatusBadges } from "./status-badges";
import type { Snapshot } from "@/lib/home/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Renders status badges only on the home page.
 * Uses usePathname to conditionally fetch and display status.
 */
export function HomeStatusBadges() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const { data: snapshotData } = useSWR<{ snapshot: Snapshot | null }>(
    isHome ? "/api/snapshot/latest" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );
  const { data: statsData } = useSWR<{ sourceCount: number }>(
    isHome ? "/api/stats" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );

  if (!isHome) return null;

  const snapshot = snapshotData?.snapshot ?? null;
  const lastUpdate = snapshot?.createdAt ?? null;
  const sourceCount = statsData?.sourceCount ?? 0;
  const coveragePercent = snapshot?.coverageScore ?? null;
  const isStale = lastUpdate
    ? Date.now() - new Date(lastUpdate).getTime() > 24 * 60 * 60 * 1000
    : false;

  // Don't render until we have at least attempted to fetch
  if (lastUpdate === undefined) return null;

  return (
    <StatusBadges
      lastUpdate={lastUpdate}
      sourceCount={sourceCount}
      coveragePercent={coveragePercent}
      isStale={isStale}
    />
  );
}
