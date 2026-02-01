import { Suspense } from "react";
import { DataSourcesClient } from "@/components/sources/data-sources-client";
import Link from "next/link";

export const metadata = {
  title: "Data sources | AGI Canary Watcher",
  description:
    "Trusted data sources feeding the AGI Canary Index—RSS feeds, curated sources, and discovery APIs.",
};

function DataSourcesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-20 bg-muted/30 rounded animate-pulse" />
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="h-64 bg-muted/30 animate-pulse" />
      </div>
    </div>
  );
}

export default function DataSourcesPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Data sources
        </h1>
        <p className="mt-2 text-muted-foreground">
          Trusted sources feeding the pipeline—transparency and provenance
        </p>
      </header>

      <Suspense fallback={<DataSourcesSkeleton />}>
        <DataSourcesClient />
      </Suspense>

      <nav
        className="flex flex-wrap gap-4 text-sm text-muted-foreground"
        aria-label="Related pages"
      >
        <Link href="/about" className="hover:text-foreground transition-colors">
          About
        </Link>
        <Link
          href="/methodology"
          className="hover:text-foreground transition-colors"
        >
          Methodology
        </Link>
      </nav>
    </div>
  );
}
