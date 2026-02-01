import { Suspense } from "react";
import { NewsPageClient } from "@/components/news/news-page-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "News & Daily Brief | AGI Canary Watcher",
  description:
    "Daily summary of what moved the needle — briefs by date and recent source articles with relevance.",
  openGraph: {
    title: "News & Daily Brief | AGI Canary Watcher",
    description:
      "Daily summary of what moved the needle — briefs by date and recent source articles.",
  },
};

function NewsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        <div className="h-8 w-2/3 bg-muted/30 rounded animate-pulse" />
        <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />
        <div className="h-64 bg-muted/30 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default function NewsPage() {
  return (
    <Suspense fallback={<NewsPageSkeleton />}>
      <NewsPageClient />
    </Suspense>
  );
}
