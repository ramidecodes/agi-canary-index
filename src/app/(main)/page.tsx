import { Suspense } from "react";
import { HomePageClient } from "@/components/home/home-page-client";

export const metadata = {
  title: "AGI Canary Watcher",
  description: "Epistemic instrumentation for AGI progress",
};

function HomePageSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero */}
      <div className="rounded-xl border border-border bg-card/50 py-10 sm:py-14 md:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="h-8 w-3/4 max-w-sm mx-auto bg-muted/30 rounded animate-pulse" />
          <div className="h-4 w-2/3 max-w-xs mx-auto bg-muted/20 rounded animate-pulse" />
          <div className="flex justify-center gap-2">
            <div className="h-6 w-20 bg-muted/30 rounded-full animate-pulse" />
            <div className="h-6 w-24 bg-muted/30 rounded-full animate-pulse" />
          </div>
          <div className="flex justify-center">
            <div className="size-80 sm:size-[500px] rounded-full bg-muted/20 animate-pulse" />
          </div>
        </div>
      </div>
      {/* Strip */}
      <div className="h-14 -mx-4 bg-muted/10 rounded-none animate-pulse" />
      {/* Primary row: two equal blocks (Movement | Autonomy) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <div className="h-48 sm:h-56 bg-muted/20 rounded-xl animate-pulse" />
        <div className="h-48 sm:h-56 bg-muted/20 rounded-xl animate-pulse" />
      </div>
      {/* Context row: Timeline full width */}
      <div className="h-40 bg-muted/20 rounded-xl animate-pulse" />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomePageClient />
    </Suspense>
  );
}
