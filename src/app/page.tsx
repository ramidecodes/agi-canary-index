import { Suspense } from "react";
import { HomePageClient } from "@/components/home/home-page-client";

export const metadata = {
  title: "AGI Canary Watcher",
  description: "Epistemic instrumentation for AGI progress",
};

function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <div className="h-24 bg-muted/30 rounded-lg animate-pulse" />
        <div className="h-8 w-3/4 bg-muted/30 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-muted/30 rounded-xl animate-pulse" />
          <div className="h-64 bg-muted/30 rounded-xl animate-pulse" />
        </div>
        <div className="h-32 bg-muted/30 rounded-xl animate-pulse" />
      </div>
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
