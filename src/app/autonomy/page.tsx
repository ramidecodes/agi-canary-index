import { Suspense } from "react";
import { AutonomyPageClient } from "@/components/autonomy/autonomy-page-client";

export const metadata = {
  title: "Autonomy & Risk | AGI Canary Watcher",
  description:
    "Long-horizon agency indicators. Monitor autonomy and risk-related canary signals for AI safety.",
};

function AutonomyPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <div className="h-24 bg-muted/30 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="h-80 bg-muted/30 rounded-xl animate-pulse" />
          <div className="lg:col-span-2 h-80 bg-muted/30 rounded-xl animate-pulse" />
        </div>
        <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-64 bg-muted/30 rounded-xl animate-pulse" />
          <div className="h-64 bg-muted/30 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function AutonomyPage() {
  return (
    <Suspense fallback={<AutonomyPageSkeleton />}>
      <AutonomyPageClient />
    </Suspense>
  );
}
