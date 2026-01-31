Here are real, already-published frameworks you can build your “AGI canary watcher” around, plus a way to merge them into one cohesive public-facing index + timeline.

⸻

Existing frameworks you can reuse as “AGI yardsticks”

1. AGI as human cognitive profile (psychometrics-based)

Hendrycks et al., “A Definition of AGI” (2025) proposes operationalizing AGI as matching the cognitive versatility + proficiency of a well-educated adult, grounded in Cattell–Horn–Carroll (CHC) cognitive domains, producing an interpretable “jagged profile” rather than one score. ￼

How you’d use it in your app
• Use their domain breakdown as your core UI (10-ish cognitive axes).
• Map new benchmarks/news to these domains (reasoning, memory, learning, etc.).
• Display “profile fill-in” over time (not just a single number).

⸻

2. Levels of AGI (capabilities × generality × autonomy)

Morris et al., “Levels of AGI” (DeepMind, 2023) frames progress using axes like performance and generality, and explicitly includes autonomy (how independently the system can act over longer horizons). ￼

How you’d use it
• Great backbone for a ladder UI (Level 0→N) plus a 2D map (Generality × Autonomy).
• Lets you explain progress without arguing “we hit AGI” prematurely.

⸻

3. Benchmark designed for “general intelligence”, not memorized skill

Chollet’s “On the Measure of Intelligence” + ARC-AGI argues intelligence ≈ skill-acquisition efficiency, and proposes ARC as a measure of abstraction + reasoning beyond narrow training distribution. ￼

How you’d use it
• ARC-AGI becomes a headline canary metric: “generalization under limited priors”.
• Plot ARC progress alongside other eval families to show divergence (e.g., coding skyrockets while abstraction lags).

⸻

4. Holistic model evaluation (multi-metric, scenario coverage)

Stanford CRFM HELM is an evaluation framework emphasizing scenario diversity + multiple metrics beyond accuracy (robustness, fairness, toxicity, efficiency, etc.). ￼

How you’d use it
• Your app can mirror HELM’s philosophy: don’t show one leaderboard; show tradeoffs.
• Great for “AGI canary” credibility: you’re explicitly tracking capabilities + externalities.

⸻

5. Autonomy & dangerous-capability evaluations (safety canaries)

METR publishes tooling and protocols for evaluating agentic autonomy and potentially dangerous capabilities; they also released task suites and protocols (including research-engineering style evals like RE-Bench). ￼
There are also papers focused on quantifying detection rates / early-warning visualization for dangerous capabilities. ￼

How you’d use it
• Add a separate “Autonomy & Risk” track: long-horizon task success, tool use, replication/abuse precursors, etc.
• This becomes your true “canary” layer—not just “how smart”, but “how close to risky autonomy”.

⸻

6. Policy-grade capability indicators

The OECD AI Capability Indicators (2025) provide a structured, human-skill-referenced set of capability levels across multiple domains and explicitly position them as a cautious way to talk about progress toward AGI. ￼

How you’d use it
• Use OECD domains as your public-friendly taxonomy (very UI-friendly).
• Cross-walk OECD domains ↔ CHC domains ↔ your benchmark buckets.

⸻

7. “Rate of progress” indices you can chart over time
   • Stanford AI Index 2025 aggregates benchmark progress and reports rapid jumps on new evals like MMMU, GPQA, SWE-bench. ￼
   • Epoch AI publishes trend analyses like an “acceleration” in frontier improvement (useful for your timeline view). ￼
   • UK AISI Frontier AI Trends includes eval trend reporting (useful as another “trend line” source). ￼

How you’d use it
• Your “daily scrape” doesn’t need to generate raw benchmark numbers—often these reports already do.
• You ingest those and keep an auditable, cited time series.

⸻

A cohesive approach you can ship: “AGI Canary Index” (ACI)

Think of it as three stacked layers:

Layer A — Capability profile (what can it do?)
• Axes from CHC/“Definition of AGI” (cognitive domains) ￼
• Plus a “generality lens” from Levels of AGI ￼

UI: radar chart + “jagged profile” animation over time.

Layer B — Generalization canaries (does it transfer?)
• ARC-AGI / abstraction-style tasks ￼
• “hard reasoning / science QA / multimodal reasoning” buckets inspired by AI Index benchmark reporting ￼

UI: a “canary strip” with 5–8 iconic tests and a status color.

Layer C — Autonomy & risk canaries (can it act?)
• METR-style autonomy evaluations + long-horizon tool use ￼
• Add “detection confidence” / “eval coverage” (so you don’t overclaim) ￼

UI: “Autonomy thermometer” + “coverage meter” (how well tested is the frontier this month?).

⸻

Where sci-fi fits (without turning it into vibes-only)

Use sci-fi as a parallel “cultural spec” timeline, not as evidence:
• Create “archetypes” (e.g., obedient assistant, misaligned operator, self-directed strategist, civilization-scale planner).
• Tag them to works across decades, then place them alongside real technical milestones as a second track.

For the technical timeline backbone, you can anchor on established AI history timelines (then curate). ￼

UI idea: two synchronized timelines:
• Reality track: eval/benchmark/report milestones (cited).
• Fiction track: archetypes + first appearances (clearly labeled as cultural references).

⸻

Concrete implementation sketch (TypeScript-first)

Data model you can build around

You want to store: 1. Claims (from news/posts/papers) 2. Evidence (links + extracted metrics) 3. Mappings (which capability axes the claim affects) 4. Scores (with uncertainty + provenance)

export type Axis =
| "reasoning"
| "learning_efficiency"
| "long_term_memory"
| "planning"
| "tool_use"
| "social_cognition"
| "multimodal_perception"
| "robustness"
| "alignment_safety";

export interface SourceRef {
title: string;
url: string;
publishedAt: string; // ISO
outlet?: string; // e.g. "arXiv", "OECD", "Stanford HAI"
}

export interface Claim {
id: string;
summary: string; // “Model X achieves Y on SWE-bench”
extractedSignals: Signal[];
sources: SourceRef[];
confidence: number; // 0..1 (your extraction + source trust)
}

export interface Signal {
axis: Axis;
direction: "up" | "down";
magnitude: number; // normalized 0..1
metric?: {
name: string; // “SWE-bench”, “ARC-AGI”, “HELM robustness”
value: number;
unit: "%" | "score" | "rate";
};
uncertainty: number; // 0..1
}

export interface DailySnapshot {
date: string; // ISO
axisScores: Record<Axis, { score: number; uncertainty: number }>;
notes: string[];
claims: string[]; // claim ids
}

Pipeline outline (pragmatic)
• Ingest: RSS + curated sources (AI Index, OECD, METR, ARC Prize, AISI, etc.)
• Extract: LLM-assisted structured extraction → Claim
• Normalize: map benchmark values into axis deltas via calibrations you define (versioned!)
• Render: profile + canary strip + timelines
• Audit: every UI element clickable → shows citations + how the score was computed

This “audit trail” is what will make the app feel legit instead of hype.

⸻

Starter source list (official hubs you should ingest)

(Links in a code block so you can paste directly.)

A Definition of AGI (Hendrycks et al.): https://www.agidefinition.ai/
Levels of AGI (Morris et al.): https://arxiv.org/abs/2311.02462
ARC Prize / ARC-AGI: https://arcprize.org/arc-agi
HELM (Stanford CRFM): https://crfm.stanford.edu/helm/
METR evaluations resources: https://evaluations.metr.org/
OECD AI Capability Indicators: https://www.oecd.org/en/publications/2025/06/introducing-the-oecd-ai-capability-indicators_7c0731f0/full-report.html
Stanford AI Index 2025: https://hai.stanford.edu/ai-index/2025-ai-index-report
UK AISI Frontier AI Trends: https://www.aisi.gov.uk/frontier-ai-trends-report
Epoch AI (capabilities trends): https://epoch.ai/

⸻

If you want something you can implement quickly: start with OECD domains as the UI taxonomy, then map in Hendrycks CHC domains behind the scenes, and use ARC-AGI + METR autonomy as your first two “canary needles.” That gets you an elegant product fast, while leaving room to deepen the scoring later.
