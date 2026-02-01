import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export const metadata = {
  title: "About | AGI Canary Watcher",
  description:
    "Epistemic instrumentation for AGI progress. Track AI capability signals from trusted sources with transparent, cited provenance.",
};

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          About AGI Canary Watcher
        </h1>
        <p className="mt-2 text-muted-foreground">
          Epistemic instrumentation for AGI progress
        </p>
      </header>

      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Mission</CardTitle>
            <CardDescription>
              A system that tracks AI/AGI progress by ingesting from trusted
              sources, extracting capability signals via AI, and visualizing
              progress across cognitive axes, generalization benchmarks, and
              autonomy risk.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What It Is</CardTitle>
            <CardDescription>
              The AGI Canary Index consolidates established frameworks—Hendrycks
              cognitive domains (CHC), Levels of AGI, ARC-AGI, METR autonomy
              evaluations, OECD capability indicators—into a single auditable
              index.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Discovers</strong> content
                from RSS feeds, curated sources, search, and X
              </li>
              <li>
                <strong className="text-foreground">Acquires</strong> full-text
                articles via Firecrawl and stores them in R2
              </li>
              <li>
                <strong className="text-foreground">Extracts</strong> claims and
                signals (axis deltas, citations) using AI
              </li>
              <li>
                <strong className="text-foreground">Aggregates</strong> daily
                snapshots of capability scores across cognitive axes
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Principles</CardTitle>
            <CardDescription>
              Every displayed score links to citations and provenance for
              transparency. We never claim &quot;AGI achieved&quot;—always use
              gradient language and uncertainty bounds.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <nav
        className="flex flex-wrap gap-4 text-sm text-muted-foreground"
        aria-label="Related pages"
      >
        <Link
          href="/methodology"
          className="hover:text-foreground transition-colors"
        >
          Methodology
        </Link>
        <Link
          href="/sources"
          className="hover:text-foreground transition-colors"
        >
          Data sources
        </Link>
      </nav>
    </div>
  );
}
