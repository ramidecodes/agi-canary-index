Perfect — let’s treat this like a museum-quality instrument, not a SaaS dashboard.

Below are clear, buildable wireframes (ASCII + layout logic) for:
• Home (everything interesting lives here)
• 3–4 focused sub-pages for depth without fragmentation

I’ll also annotate why each element exists, so you don’t end up with ornamental UI.

⸻

1. HOME PAGE — “AGI Canary Control Room”

This page answers, at a glance:

Where are we?
What moved recently?
How confident are we?
Should we be worried?

⸻

1.1 Global Layout (Desktop)

┌──────────────────────────────────────────────────────────────┐
│ AGI CANARY WATCHER ● LIVE │
│ Epistemic instrumentation for AGI progress │
│ Last update: Jan 30, 2026 | Sources: 124 | Coverage: 71% │
├──────────────────────────────────────────────────────────────┤
│ │
│ ┌───────────────┐ ┌───────────────────────────┐ │
│ │ │ │ │ │
│ │ CAPABILITY │ │ AUTONOMY / RISK │ │
│ │ RADAR │ │ THERMOMETER │ │
│ │ │ │ │ │
│ │ │ │ ████░░░░░░ │ │
│ │ │ │ Watchful │ │
│ └───────────────┘ └───────────────────────────┘ │
│ │
├──────────────────────────────────────────────────────────────┤
│ CANARY STRIP │
│ [ ARC ] [ LONG-H ] [ TOOL ] [ SELF ] [ ECON ] [ ALIGN ] │
│ 🟢 🟡 🟡 🔴 🟡 🟢 │
├──────────────────────────────────────────────────────────────┤
│ │
│ TODAY’S MOVEMENT │
│ ↑ Reasoning +0.04 (SWE-bench) │
│ ↑ Tool Use +0.02 (Agent framework demo) │
│ ↓ Coverage −0.01 (Missing evals) │
│ │
├──────────────────────────────────────────────────────────────┤
│ TIMELINE (Reality ↔ Fiction) │
│ ───────────────────────────────────────────────────────── │
│ | 2020 | 2022 | 2024 | 2026 | │
│ │
└──────────────────────────────────────────────────────────────┘

⸻

1.2 Home Page Sections (why each matters)

A. Capability Radar (center-left)
• First thing eyes land on
• Communicates shape of intelligence, not hype
• Hover → axis explanation + sources
• Click → Capability Detail Page

This is your signature visual.

⸻

B. Autonomy / Risk Thermometer (center-right)
• Single vertical gauge
• Labels like:
• Non-agentic
• Tool-using
• Long-horizon agent
• Self-directed
• Never says “AGI achieved” — always gradient language

Click → Autonomy & Risk Page

⸻

C. Canary Strip (persistent)

Always visible, even when scrolling.

Each canary opens a popover, not a new page:

ARC-AGI
Status: 🟢 Stable
Last change: +0.01 (14 days)
Confidence: 0.78
Sources: 3

This becomes your trust anchor.

⸻

D. Today’s Movement

Short. Brutally editorial.
• What changed
• Why
• What didn’t move (important!)

Shareable. Screenshot-ready.

⸻

E. Timeline Preview

Only a preview here.
• Scrollable horizontally
• Click → Timeline Page

⸻

2. CAPABILITY DETAIL PAGE — “Cognitive Fingerprint”

Path: /capabilities

Purpose:

Show where progress is uneven and where it’s stalling

⸻

Layout

┌──────────────────────────────────────────────────────────────┐
│ Capability Profile │
│ Cognitive domains vs human baseline │
├──────────────────────────────────────────────────────────────┤
│ │
│ [ Radar Chart — Large ] │
│ - Solid: current estimate │
│ - Glow: uncertainty │
│ - Ghosts: past months │
│ │
├──────────────────────────────────────────────────────────────┤
│ DOMAIN BREAKDOWN │
│ │
│ Reasoning ███████░░░ +0.04 ↑ │
│ Abstraction ███░░░░░░░ +0.01 → │
│ Planning █████░░░░░ +0.02 ↑ │
│ Long-term Memory ████░░░░░░ +0.00 → │
│ │
├──────────────────────────────────────────────────────────────┤
│ SOURCE MAP │
│ (Benchmarks, papers, reports affecting this domain) │
└──────────────────────────────────────────────────────────────┘

⸻

Key interaction

Time scrubber

←───────────●──────────→
Jan 2024 Jan 2026

Dragging it morphs the radar in real time.

⸻

3. AUTONOMY & RISK PAGE — “The Canary Cage”

Path: /autonomy

Purpose:

Separate impressive demos from agentic capability

⸻

Layout

┌──────────────────────────────────────────────────────────────┐
│ Autonomy & Risk │
│ Long-horizon agency indicators │
├──────────────────────────────────────────────────────────────┤
│ │
│ AUTONOMY SCALE │
│ │
│ ─────────────────────────── │
│ Tool-only │
│ ████████░░░░░░░░░ │
│ Long-horizon agent │
│ │
├──────────────────────────────────────────────────────────────┤
│ RISK CANARIES │
│ │
│ Long-horizon planning 🟡 │
│ Recursive self-improvement 🔴 │
│ Economic displacement 🟡 │
│ Alignment eval coverage 🟢 │
│ │
├──────────────────────────────────────────────────────────────┤
│ WHAT TRIGGERED THIS? │
│ • METR task suite v3 │
│ • Agent demo with >24h autonomy │
│ │
└──────────────────────────────────────────────────────────────┘

This page should feel slightly uncomfortable. That’s good.

⸻

4. TIMELINE PAGE — “Reality vs Fiction”

Path: /timeline

Purpose:

Anchor hype in historical perspective

⸻

Layout

┌──────────────────────────────────────────────────────────────┐
│ Timeline │
│ Technical progress vs cultural imagination │
├──────────────────────────────────────────────────────────────┤
│ │
│ REALITY ──────────────────────────────────────────────── │
│ 2023 • ARC-AGI baseline │
│ 2024 • SWE-bench jump │
│ 2025 • Autonomy evals │
│ │
│ FICTION ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│ 1968 • HAL-9000 │
│ 1984 • Neuromancer │
│ 2013 • Her │
│ │
└──────────────────────────────────────────────────────────────┘

Toggle:

[✓] Reality [✓] Fiction [ ] Speculative

Important: Fiction is explicitly labeled to preserve epistemic hygiene.

⸻

5. SIGNAL EXPLORER — “Evidence Graph”

Path: /signals

Purpose:

Let skeptics audit you

⸻

Layout

┌──────────────────────────────────────────────────────────────┐
│ Signal Explorer │
│ Claims, evidence, and confidence │
├──────────────────────────────────────────────────────────────┤
│ │
│ [ Graph Visualization ] │
│ ○ Claim │
│ □ Benchmark │
│ △ Paper │
│ │
│ Hover → provenance + confidence │
│ │
├──────────────────────────────────────────────────────────────┤
│ FILTERS │
│ [ Capability ] [ Autonomy ] [ Risk ] │
│ [ High confidence only ] │
└──────────────────────────────────────────────────────────────┘

This is where journalists and researchers will live.

⸻

6. Mobile Strategy (important)

Mobile ≠ full dashboard.

Mobile home becomes: 1. Canary status 2. Today’s movement 3. One scrollable radar snapshot 4. Link to “full instrument (desktop)”

Think intelligence briefing, not control room.

⸻

7. Navigation Philosophy

Minimal top-level nav:

[ Home ] [ Capabilities ] [ Autonomy ] [ Timeline ] [ Signals ]

⸻
