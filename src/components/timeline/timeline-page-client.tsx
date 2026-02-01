"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TimelineVisualization } from "./timeline-visualization";
import { TimelineFilters } from "./timeline-filters";
import { TimeNavigation } from "./time-navigation";
import { EventDetailSheet } from "./event-detail-sheet";
import { HomeFooter } from "@/components/home/home-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimelineEvent } from "@/lib/timeline/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TimelinePageClient() {
  const searchParams = useSearchParams();

  const eventFromUrl = searchParams.get("event");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    eventFromUrl,
  );
  const [sheetOpen, setSheetOpen] = useState(!!eventFromUrl);
  const [scrollToYear, setScrollToYear] = useState<number | null>(null);

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");

  const { data: categoriesData } = useSWR<{ categories: string[] }>(
    "/api/timeline/categories",
    fetcher,
    { revalidateOnFocus: false },
  );

  const { data: rangeData } = useSWR<{ events: TimelineEvent[] }>(
    "/api/timeline?start=1950&end=2030",
    fetcher,
    { revalidateOnFocus: false },
  );

  const { data: searchData } = useSWR<{ events: TimelineEvent[] }>(
    searchQuery.length >= 2
      ? `/api/timeline/search?q=${encodeURIComponent(searchQuery)}`
      : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const categories = categoriesData?.categories ?? [];

  const events = useMemo(() => {
    const source =
      searchQuery.length >= 2 ? searchData?.events : rangeData?.events;
    const list = source ?? [];
    if (selectedCategories.size === 0) return list;
    return list.filter((e) => selectedCategories.has(e.category));
  }, [searchQuery, searchData?.events, rangeData?.events, selectedCategories]);

  useEffect(() => {
    if (eventFromUrl && eventFromUrl !== selectedEventId) {
      setSelectedEventId(eventFromUrl);
      setSheetOpen(true);
    }
  }, [eventFromUrl, selectedEventId]);

  const handleEventClick = useCallback((event: TimelineEvent) => {
    setSelectedEventId(event.id);
    setSheetOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.set("event", event.id);
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("event");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleJump = useCallback((year: number) => {
    setScrollToYear(year);
    setTimeout(() => setScrollToYear(null), 100);
  }, []);

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    const url = new URL(window.location.href);
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    window.history.replaceState({}, "", url.toString());
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Timeline</h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI progress milestones. Benchmarks, model releases, and policy
              events in historical context.
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
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Filter & search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimelineFilters
              categories={categories}
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <TimeNavigation onJump={handleJump} />
          <TimelineVisualization
            events={events}
            onEventClick={handleEventClick}
            scrollToYear={scrollToYear}
          />
        </div>

        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              Click an event marker to view details. Use the minimap or quick
              jump buttons to navigate. Events added and updated as new
              milestones are identified.
            </p>
          </CardContent>
        </Card>

        <HomeFooter />
      </div>

      <EventDetailSheet
        eventId={selectedEventId}
        open={sheetOpen}
        onOpenChange={(open) => !open && handleSheetClose()}
      />
    </div>
  );
}
