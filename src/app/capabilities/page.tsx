import { Suspense } from "react";
import { CapabilityProfileClient } from "@/components/capabilities/capability-profile-client";

export const metadata = {
  title: "Capability Profile | AGI Canary Watcher",
  description:
    "Deep-dive into AI capability metrics across cognitive domains with historical context.",
};

function CapabilityProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-4 h-14 bg-muted/30 animate-pulse rounded" />
      </div>
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-8">
        <div className="h-20 bg-muted/30 rounded animate-pulse" />
        <div className="flex justify-center">
          <div className="size-[520px] max-w-[60vw] bg-muted/30 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 h-96 bg-muted/30 rounded-xl animate-pulse" />
          <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />
        </div>
      </main>
    </div>
  );
}

export default function CapabilityProfilePage() {
  return (
    <Suspense fallback={<CapabilityProfileSkeleton />}>
      <CapabilityProfileClient />
    </Suspense>
  );
}
