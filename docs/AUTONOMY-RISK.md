# Autonomy & Risk Page

Dedicated view for autonomy and risk-related canary indicators ("The Canary Cage"). Implemented per [docs/features/08-autonomy-risk.md](features/08-autonomy-risk.md).

## Overview

- **Route:** `/autonomy`
- **Purpose:** Monitor autonomy and risk-related AI capability signals separately from general capability progress
- **Tone:** Serious but not alarmist; factual; uncertainty always visible

## Components

- **Autonomy Gauge** — Vertical scale (custom SVG, no D3) with 5 levels: Tool-only → Scripted → Adaptive → Long-horizon → Self-directed
- **Risk Canaries Panel** — Grid of risk canaries with expandable details
- **Trigger Log** — Recent signals affecting autonomy (tool_use, planning, alignment_safety)
- **Evaluation Coverage Meter** — Breakdown by eval type (METR, red team, long-horizon, deception)
- **Historical Autonomy Chart** — Recharts AreaChart with confidence bands
- **Interpretation Guide** — Collapsible plain-language explanation

## API Endpoints

| Endpoint                                                          | Description                            |
| ----------------------------------------------------------------- | -------------------------------------- |
| `GET /api/autonomy/current`                                       | Current autonomy level and uncertainty |
| `GET /api/autonomy/history?days=90`                               | Historical autonomy levels             |
| `GET /api/autonomy/coverage`                                      | Evaluation coverage metrics            |
| `GET /api/canaries?type=risk`                                     | Risk-related canaries only             |
| `GET /api/signals/recent?axes=tool_use,planning,alignment_safety` | Recent autonomy-related triggers       |

## Recharts vs D3 for the Gauge

**Evaluation (2025):**

- **Recharts RadialBarChart** — Creates arc/semi-circular gauges (speedometer-style). Not designed for vertical linear scales with 5 discrete levels.
- **D3** — Excels at bespoke visualizations but requires refs + useEffect with React. The capability-radar already uses pure SVG without D3.
- **Recommendation:** Use **custom SVG for the gauge** (matches capability-radar pattern). Use **Recharts for all charts** (historical autonomy, axis detail). D3 is not needed; remove it if unused elsewhere.

## Risk Canary IDs

- `long_horizon` — Long-horizon planning
- `self_improvement` — Recursive self-improvement signals
- `economic_impact` — Economic displacement
- `alignment_coverage` — Alignment eval coverage
- `deception` — Deception detection
- `tool_creation` — Tool creation capability

Seeded via `pnpm run db:seed`.
