These are to be used as base sources on top of the daily discovery pipeline

Absolutely. You want a stable “bedrock layer” of feeds that:
• are slow-moving but authoritative
• publish primary material (evals, reports, benchmarks)
• won’t disappear or turn hype-driven
• can anchor your daily discovery signals

Below is a curated, opinionated base feed set, organized by epistemic role. This is the set I’d hard-code as Tier-0 sources in your pipeline.

⸻

Tier-0: Authoritative, low-noise core feeds

(These should run continuously, even if discovery breaks.)

1. Frontier evaluation & measurement (critical for your canaries)

Stanford HAI
• AI Index Report
• Technical performance chapters
• Benchmark trend summaries
RSS / pages
• https://hai.stanford.edu/news
• https://hai.stanford.edu/ai-index

Why: baseline for capability deltas over time.

⸻

METR
• Autonomy & dangerous-capability evaluations
• Long-horizon task research
Feeds
• https://metr.org/blog
• https://evaluations.metr.org/

Why: your autonomy + risk canary backbone.

⸻

ARC Prize
• ARC-AGI progress updates
• Competition announcements
Feeds
• https://arcprize.org/blog
• https://arcprize.org/arc-agi

Why: the cleanest signal for generalization vs memorization.

⸻

OECD
• AI Capability Indicators
• Policy-grade measurement frameworks
Feeds
• https://www.oecd.org/ai/
• https://www.oecd.org/digital/

Why: legitimizes your metrics outside tech Twitter.

⸻

2. Frontier labs (primary source, not commentary)

DeepMind
• Eval papers
• Capability framing (e.g. Levels of AGI)
Feeds
• https://deepmind.google/discover/blog/
• https://deepmind.google/research/

⸻

OpenAI
• System cards
• Eval disclosures
Feeds
• https://openai.com/research
• https://openai.com/blog

⸻

Anthropic
• Model cards
• Safety & eval research
Feeds
• https://www.anthropic.com/research
• https://www.anthropic.com/news

Why these three: they publish primary artifacts you can quote, not second-hand takes.

⸻

3. Independent research & trend analysis (meta-signal)

Epoch AI
• Capability trend analysis
• Compute & scaling studies
Feeds
• https://epoch.ai/blog
• https://epoch.ai/data

Why: converts noisy benchmarks into rate-of-change insights.

⸻

UK AISI
• Frontier AI Trends reports
• Government-grade assessments
Feeds
• https://www.aisi.gov.uk/research
• https://www.aisi.gov.uk/news

Why: strong counterweight to Silicon Valley optimism.

⸻

Center for AI Safety
• Capability & risk framing
• Public statements
Feeds
• https://www.safe.ai/blog

Use sparingly; flag as risk-weighted interpretation.

⸻

4. Academic signal (filtered, not raw firehose)

arXiv (filtered)

Do not ingest all of arXiv.

Create strict category + keyword filters:
• cs.AI
• cs.LG
• stat.ML
with keywords:
• evaluation, benchmark, generalization, autonomy, agents, long-horizon

RSS example:

https://arxiv.org/rss/cs.AI

Why: arXiv is early signal, but needs AI-based triage.

⸻

5. High-signal commentary (clearly labeled)

These are Tier-1, not Tier-0 — still valuable, but opinionated.

LessWrong
• Alignment & long-term framing
Feed:
• https://www.lesswrong.com/feed.xml

⸻

Alignment Forum
• Deep technical alignment discussions
Feed:
• https://alignmentforum.org/feed.xml

⸻

Import AI
• Curated weekly signal
Feed:
• https://jack-clark.net/feed/

Why: good editorial condensation, not raw evidence.

⸻

6. Institutional & policy (slow but grounding)

NIST
• AI risk frameworks
• Eval standards
Feed:
• https://www.nist.gov/artificial-intelligence

⸻

European Commission
• AI Act updates
• Regulatory framing
Feed:
• https://digital-strategy.ec.europa.eu/en/news

Why: helps anchor societal impact canaries.

⸻

How to integrate these into your pipeline (important)

Source tiering

type SourceTier = "TIER_0" | "TIER_1" | "DISCOVERY";

    •	Tier-0
    •	Always ingested
    •	Higher trust weight
    •	Can move canaries with fewer corroborations
    •	Discovery
    •	Needs cross-confirmation
    •	Lower default confidence

Feed metadata you should store

interface FeedSource {
name: string;
url: string;
tier: "TIER_0" | "TIER_1";
trustWeight: number; // e.g. 0.9 for OECD, 0.6 for blogs
cadence: "daily" | "weekly" | "monthly";
domainType: "evaluation" | "policy" | "research" | "commentary";
}

⸻

My recommended minimal Tier-0 starter set (v1)

If you want to ship fast, start with just these 10 feeds: 1. Stanford AI Index 2. METR 3. ARC Prize 4. OECD AI Indicators 5. DeepMind Research 6. OpenAI Research 7. Anthropic Research 8. Epoch AI 9. UK AISI 10. Filtered arXiv cs.AI

This already gives you better epistemic grounding than 95% of AI dashboards.

⸻
