import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { AXES } from "@/lib/signal/schemas";

export const metadata = {
  title: "Methodology | AGI Canary Watcher",
  description:
    "How the AGI Canary Index is built: frameworks, cognitive axes, signal extraction, and daily snapshots.",
};

const AXIS_LABELS: Record<(typeof AXES)[number], string> = {
  reasoning: "Reasoning",
  learning_efficiency: "Learning efficiency",
  long_term_memory: "Long-term memory",
  planning: "Planning",
  tool_use: "Tool use",
  social_cognition: "Social cognition",
  multimodal_perception: "Multimodal perception",
  robustness: "Robustness",
  alignment_safety: "Alignment & safety",
};

export default function MethodologyPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Methodology
        </h1>
        <p className="mt-2 text-muted-foreground">
          How the AGI Canary Index is built—frameworks, axes, and pipeline
        </p>
      </header>

      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Frameworks</CardTitle>
            <CardDescription>
              The index consolidates established academic and policy frameworks
              into a single auditable system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-4 text-sm">
              <li>
                <strong className="text-foreground">
                  CHC cognitive domains (Hendrycks et al.)
                </strong>{" "}
                — &quot;A Definition of AGI&quot; proposes operationalizing AGI
                as matching cognitive versatility across Cattell–Horn–Carroll
                domains, producing an interpretable jagged profile rather than
                one score.
              </li>
              <li>
                <strong className="text-foreground">
                  Levels of AGI (Morris et al., DeepMind)
                </strong>{" "}
                — Frames progress using performance, generality, and autonomy.
                Explains progress without claiming &quot;AGI achieved&quot;
                prematurely.
              </li>
              <li>
                <strong className="text-foreground">ARC-AGI</strong> — Measures
                abstraction and reasoning beyond narrow training distribution.
                The canary for generalization vs memorization.
              </li>
              <li>
                <strong className="text-foreground">
                  METR autonomy evaluations
                </strong>{" "}
                — Tooling and protocols for agentic autonomy, long-horizon task
                success, and dangerous-capability detection. The backbone for
                our autonomy & risk track.
              </li>
              <li>
                <strong className="text-foreground">
                  OECD AI Capability Indicators
                </strong>{" "}
                — Policy-grade, human-skill-referenced capability levels across
                domains. Cross-walks with CHC for a public-friendly taxonomy.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9 Cognitive Axes</CardTitle>
            <CardDescription>
              Capability signals are mapped to these axes. Scores use -1..1
              scale with uncertainty bounds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2 text-sm">
              {AXES.map((axis) => (
                <li
                  key={axis}
                  className="rounded-md bg-muted/50 px-3 py-2 font-mono text-muted-foreground"
                >
                  <span className="text-foreground">{AXIS_LABELS[axis]}</span>
                  <span className="ml-2 text-xs opacity-75">{axis}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
            <CardDescription>
              Content flows from discovery through extraction to daily
              snapshots.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-4 text-sm">
              <li className="flex gap-3">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
                  aria-hidden
                >
                  1
                </span>
                <div>
                  <strong className="text-foreground">Discovery</strong> — RSS
                  feeds, curated sources, search APIs, and X. URLs are
                  deduplicated and stored as items.
                </div>
              </li>
              <li className="flex gap-3">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
                  aria-hidden
                >
                  2
                </span>
                <div>
                  <strong className="text-foreground">Acquisition</strong> —
                  Firecrawl scrapes full-text, content is validated (length,
                  paywall), stored in R2, and linked to documents.
                </div>
              </li>
              <li className="flex gap-3">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
                  aria-hidden
                >
                  3
                </span>
                <div>
                  <strong className="text-foreground">AI extraction</strong> —
                  Vercel AI SDK + OpenRouter. LLM extracts claims, axis impacts,
                  benchmarks, confidence, citations. Confidence is adjusted by
                  source trust weight; signals below threshold are filtered.
                </div>
              </li>
              <li className="flex gap-3">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
                  aria-hidden
                >
                  4
                </span>
                <div>
                  <strong className="text-foreground">Daily snapshots</strong> —
                  Signals for a date are aggregated into axis scores
                  (confidence-weighted average of direction × magnitude). Delta
                  is day-over-day change.
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit trail</CardTitle>
            <CardDescription>
              Every displayed score links to citations and provenance. The app
              surfaces source attribution, confidence, and uncertainty.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <nav
        className="flex flex-wrap gap-4 text-sm text-muted-foreground"
        aria-label="Related pages"
      >
        <Link href="/about" className="hover:text-foreground transition-colors">
          About
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
