import { Suspense } from "react";
import { TimelinePageClient } from "@/components/timeline/timeline-page-client";

export const metadata = {
  title: "Timeline | AGI Canary Watcher",
  description:
    "Explore AI progress milestones. Technical benchmarks, model releases, and policy events in historical context.",
};

function TimelinePageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <div className="h-12 w-64 bg-muted/30 rounded animate-pulse" />
        <div className="h-10 w-full bg-muted/30 rounded animate-pulse" />
        <div className="h-96 bg-muted/30 rounded-xl animate-pulse" />
        <div className="h-16 w-full bg-muted/30 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<TimelinePageSkeleton />}>
      <TimelinePageClient />
    </Suspense>
  );
}
