import { Suspense } from "react";
import { SignalExplorerClient } from "@/components/signals/signal-explorer-client";

export const metadata = {
  title: "Signal Explorer | AGI Canary Watcher",
  description:
    "Explore and audit the evidence behind every metric. Filter by axis, source, confidence, and export for verification.",
};

function SignalExplorerSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-12 w-64 bg-muted/30 rounded animate-pulse" />
      <div className="h-24 w-full bg-muted/30 rounded animate-pulse" />
      <div className="h-10 w-48 bg-muted/30 rounded animate-pulse" />
      <div className="h-96 bg-muted/30 rounded-xl animate-pulse" />
      <div className="h-16 w-full bg-muted/30 rounded animate-pulse" />
    </div>
  );
}

export default function SignalsPage() {
  return (
    <Suspense fallback={<SignalExplorerSkeleton />}>
      <SignalExplorerClient />
    </Suspense>
  );
}
