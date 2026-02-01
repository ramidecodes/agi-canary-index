# Home Autonomy Level Component

## Goal

The home page autonomy indicator (AutonomyThermometer) must use the same data source, scale, and labels as the Autonomy & Risk page so that "should we worry?" is answered consistently across the app. The gauge must be clearly visible (readable fill) and optionally show uncertainty and empty state.

## User Story

As a visitor on the home page, I want to see the current autonomy level from the canonical API with the same 5-level scale as the Autonomy page, so that I get a single source of truth and can click through for details.

## Data Source

**Single source of truth:** `GET /api/autonomy/current`

Response shape (relevant for home component):

- `level` — number 0–1 (normalized autonomy).
- `levelIndex` — number 0–4 (index into levels array).
- `levelLabel` — string (e.g. "Scripted agent (Level 1)").
- `uncertainty` — number 0.1–0.5 (optional; show as band or tooltip).
- `levels` — array of `{ id, label }` for 5 levels.
- `lastUpdated` — ISO string or null.
- `insufficientData` — boolean; when true, show empty/placeholder state.

**5-level scale (bottom to top):**

1. Tool-only (Level 0)
2. Scripted agent (Level 1)
3. Adaptive agent (Level 2)
4. Long-horizon agent (Level 3)
5. Self-directed (Level 4)

Formula: level derived from `(planning + tool_use + alignment_safety) / 3` from latest daily snapshot (see [08-autonomy-risk.md](08-autonomy-risk.md) and API implementation).

## Functional Requirements

1. **Data fetching** — Home page fetches `/api/autonomy/current` via SWR (same revalidation as other home data). No local derivation from snapshot for autonomy.

2. **Props** — AutonomyThermometer receives: `level`, `uncertainty` (optional), `levelLabel`, `insufficientData`. Optional: `lastUpdated` for tooltip or subtitle.

3. **Scale and labels** — Component uses the 5-level scale and labels (Tool-only … Self-directed). Labels must match `/api/autonomy/current` and [autonomy-gauge.tsx](/src/components/autonomy/autonomy-gauge.tsx) on the Autonomy page.

4. **Visible fill** — The vertical fill indicator must be clearly visible (e.g. stronger gradient, minimum height, or contrast). Avoid faint fill at low levels (e.g. 35%).

5. **Uncertainty** — Optional: show uncertainty as a blurred band or tooltip so users see confidence. If space is limited, at least support the prop for future use.

6. **Empty state** — When `insufficientData` is true, show a neutral placeholder (e.g. "Insufficient data" or muted gauge) and still link to `/autonomy`.

7. **Link** — Clicking the card navigates to `/autonomy` (unchanged).

## Acceptance Criteria

- [ ] Home page uses SWR to fetch `/api/autonomy/current`; no autonomy level derived from snapshot in client.
- [ ] AutonomyThermometer displays 5 levels with labels: Tool-only (Level 0) … Self-directed (Level 4).
- [ ] Gauge fill is clearly visible at typical levels (e.g. 0.35).
- [ ] When `insufficientData` is true, component shows empty/placeholder state without breaking layout.
- [ ] Autonomy page and home thermometer show the same level for the same data (same API).

## References

- [08-autonomy-risk.md](08-autonomy-risk.md) — Autonomy page and scale definition
- `GET /api/autonomy/current` — [src/app/api/autonomy/current/route.ts](/src/app/api/autonomy/current/route.ts)
- Autonomy page gauge: [src/components/autonomy/autonomy-gauge.tsx](/src/components/autonomy/autonomy-gauge.tsx)
