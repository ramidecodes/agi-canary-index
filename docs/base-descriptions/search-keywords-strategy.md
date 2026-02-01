Absolutely — here’s a purpose-built taxonomy of keywords optimized for your Canaryline discovery pipeline. These keywords are crafted to help you find high-signal articles and reports that are meaningful for measuring AI progress, not just hype.

I’ve grouped them by signal category so you can combine or weight them differently depending on your source type (RSS vs search API).

⸻

🔍 Core Signal Taxonomy

These keywords are tuned for discovery — they’re not generic AI terms but deliberately aimed at quantitative progress, evaluation, capabilities, deployment, and risk signals.

⸻

🧠 1. Capability Progress (benchmarks, metrics, performance)

Use these to find measurable progress on core AI performance:

AI benchmark
AI evaluation benchmark
scaling law results
GPT competitor score
AGI benchmark
generalization benchmark
performance improvement AI
AI milestone result
AI state-of-the-art
AI leaderboards
score update
model evaluation result
evaluation dataset name (e.g. ARC, MMLU, BIG-bench)
AI capability growth

Examples:
• “AI benchmark ARC generalization”
• “MMLU score improvement 2026”

⸻

📈 2. Generalization & Transfer

These indicate whether models are learning principles, not memorizing:

generalization performance
out-of-distribution generalization
zero-shot reasoning improvement
few-shot reasoning gain
robotics generalization result
cross-domain reasoning AI
systemic abstraction score
benchmarks for transfer learning

⸻

🤖 3. Autonomy & Long-Horizon Agency

Signals about agentic behavior, planning, tool use:

long-horizon planning agent
recursive reasoning agent
autonomous decision-making ai
agentic behavior in ai
tool-use evaluation ai
long-term strategy ai system
automated system planning

⸻

🧬 4. Self-Improvement & Adaptation

These catch truly dynamic behaviors:

self-improving ai
adaptive ai behavior
learning from interaction
model self-optimization
progressive self-adaptation
recursive self-training ai
continuous learning agent

⸻

🧠 5. Structural / Architectural Milestones

These point to core research shifts:

emergent intelligence
scaling breakthrough
compute scaling results
multimodal reasoning breakthrough
reasoning architecture improvement
neural symbolic integration
hybrid reasoning models

⸻

🔒 6. Safety / Alignment / Risk Indicators

These help capture risk-relevant but still grounded articles:

AI alignment evaluation
capability risk assessment
frontier AI policy
AI safety benchmark
AI risk metric result
AI evaluation transparency
unsafe model behavior report
alignment research result
misuse potential ai

⸻

🌍 7. Deployment / Real-World Impact

Real-world deployments that materially change things:

ai deployment scale
large scale ai automation
economic displacement ai
ai workforce impact
industry AI adoption evidence
AI in critical infrastructure
AI system replacing human task

⸻

📰 8. Institutional / Official Reports

These keywords help find reports from institutions:

OECD AI capability indicators
government AI evaluation report
frontier AI trends report
national AI benchmark report
policy ai performance metrics
regulatory ai performance update

⸻

🧠 9. Specific Benchmark Names (for precision)

These are names you can combine with other keywords:

ARC-AGI
MMLU
BIG-bench
BBB (Better-Balanced Benchmarks)
AGIEval
GPQA
SWE-bench
HellaSwag
SuperGLUE

⸻

🤝 10. Combining Keywords (Boolean search hacks)

Broad discovery

AI AND (benchmark OR evaluation OR progress OR milestone OR performance)

Long-horizon / autonomy

(agent OR autonomous OR planning) AND (AI OR model) AND performance

Safety evaluations

(alignment OR risk OR safety) AND (AI OR model) AND (benchmark OR evaluation)

Institutional reports

(OECD OR government) AND (AI OR “capability indicator” OR report)

Model-specific progress

(model name OR model family) AND (score OR benchmark OR evaluation)

—

📌 Recommended weighted keyword groups

You should attach source context and signal weight depending on feed type.

Tier-0 search patterns (scientific/service feeds)

- “benchmark result”
- “evaluation metric”
- “capability improvement”
- “generalization performance”
- “ARC-AGI” OR “MMLU”

Tier-1 search patterns (broader site crawls)

- “state-of-the-art AI”
- “AI milestone”
- “long-horizon agent”
- “autonomous reasoning”
- “AI risk evaluation”

Noise filters (useful negation terms)

NOT “AI art” NOT “AI marketing hype” NOT “GPT” by itself

Use negation only for large open crawls — not RSS.

⸻

📦 Example Combined Search Queries

1. High-signal evaluation

"AI benchmark" AND "generalization" AND 2026

2. Autonomy progress

("agentic" OR "autonomous") AND ("planning" OR "tool use") AND "benchmark"

3. Institutional assessment

(OECD OR "AI capability indicators") AND (report OR evaluation OR benchmark)

4. Alignment / risk

(alignment OR safety OR risk) AND (benchmark OR evaluation OR report)

⸻

🧠 Practical Implementation Notes

1. Tiered weighting in your pipeline

Assign different signal weights based on keyword match type:

Match type Weight
Tier-0 exact benchmark 1.0
Institutional report keywords 0.9
Autonomy/agent keywords 0.8
Safety & alignment 0.7
Deployment/economic impact 0.6
Generic AI progress 0.5

Your aggregator can then use this weight to decide:
• which canaries to bump
• how much confidence to assign

⸻

2. Keyword filters per feed type
   • RSS feeds: broad — use filters to downselect
   • Search API: use weighted boolean queries
   • Curated sources: no filtering — ingest everything

⸻

🛠 Example Keyword Config (JSON)

This is ready to drop into your config:

{
"capability": [
"AI benchmark",
"benchmark result",
"evaluation metric",
"performance improvement",
"state-of-the-art AI"
],
"generalization": [
"generalization performance",
"out-of-distribution",
"transfer learning"
],
"autonomy": [
"agentic behavior",
"autonomous planning",
"long-horizon agent",
"tool use evaluation"
],
"self_improvement": [
"self-improving AI",
"recursive self-training",
"continuous learning agent"
],
"safety_alignment": [
"AI alignment evaluation",
"capability risk assessment",
"frontier AI policy",
"AI safety benchmark"
],
"institutional_reports": [
"OECD AI capability indicators",
"government AI evaluation report",
"national AI benchmark report"
],
"deployment": [
"AI deployment scale",
"economic displacement AI",
"AI workforce impact"
],
"benchmarks": [
"ARC-AGI",
"MMLU",
"BIG-bench",
"AGIEval",
"GPQA",
"SWE-bench"
]
}
