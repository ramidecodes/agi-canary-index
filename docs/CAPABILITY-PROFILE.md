# Capability Profile Page

Deep-dive view into the AI capability profile ("Cognitive Fingerprint"). Implements [07-capability-profile.md](features/07-capability-profile.md).

## Route

- **Page:** `/capabilities`
- **Entry:** [src/app/capabilities/page.tsx](../src/app/capabilities/page.tsx)

## Chart Library

- **Radar:** Declarative SVG (same as home page [CapabilityRadar](../src/components/home/capability-radar.tsx)); extended with optional `onAxisClick` and `selectedAxis` for profile page.
- **Line chart (axis detail modal):** **Recharts** (`LineChart`, `AreaChart`, `Area`, `Line`, `Tooltip`, `ResponsiveContainer`) for historical axis score over time with optional uncertainty band.

Other features (Autonomy & Risk, Timeline, Signal Explorer Phase 2) use Recharts for line/area charts where applicable; radar and custom visualizations (gauge, timeline, force-directed graph) remain declarative SVG or D3/VisX.

## APIs

| Endpoint                   | Method | Description                                                                                        |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| `/api/snapshot/[date]`     | GET    | Snapshot for a specific date, or nearest available. Returns `snapshot`, `resolvedDate`, `isExact`. |
| `/api/snapshot/range`      | GET    | Min/max snapshot dates for time scrubber. Returns `minDate`, `maxDate`.                            |
| `/api/axis/[axis]/history` | GET    | Historical scores for one axis (query: `days`, default 90). For axis detail line chart.            |
| `/api/axis/[axis]/sources` | GET    | Sources (signals + document/source metadata) contributing to an axis (query: `limit`).             |
| `/api/signals`             | GET    | Signals filtered by `axis` and optional `date` (query: `axis`, `date`, `limit`).                   |

## State (Zustand)

- **Store:** [src/lib/capabilities/store.ts](../src/lib/capabilities/store.ts)
- **State:** `selectedDate`, `activeAxis`, `filters` (benchmarksOnly, includeClaims, showSpeculative), `sortBy` (alphabetical, score, recentChange).

## URL State

- `?date=YYYY-MM-DD` — Selected date for scrubber and displayed snapshot.
- `?axis=<axis>` — Active axis (scroll target, detail modal, source map).

## Components

- **CapabilityProfileClient** — Main client: SWR fetches, URL sync, layout.
- **TimeScrubber** — Slider over available dates + presets (Today, 1 month ago, 3 months ago, 1 year ago). Uses shadcn Slider.
- **DomainBreakdown** — List of 9 axes with progress bar, delta, uncertainty, "View sources" / "Based on N sources", "View details". Sort: alphabetical, by score, by recent change.
- **SourceMapPanel** — Sources for selected axis (title, outlet, date, confidence, link).
- **AxisDetailModal** — Dialog with axis description and Recharts line/area chart (score over time + uncertainty band).
- **FilterToggles** — Benchmarks only, Include claims, Show speculative (shadcn Checkbox).

## Data Flow

1. Page loads → fetch `/api/snapshot/range`, `/api/snapshot/history?days=365` → build `availableDates`.
2. `effectiveDate` = selectedDate ?? url `date` ?? latest → fetch `/api/snapshot/[date]`.
3. Radar and domain breakdown use that snapshot; ghost lines use history around effective date.
4. Click axis → set activeAxis, scroll to breakdown, optional open detail modal or source map.
5. Axis detail modal → fetch `/api/axis/[axis]/history?days=90` → Recharts line chart.
6. "View sources" → fetch `/api/axis/[axis]/sources` → show SourceMapPanel.

## Edge Cases

- No data for selected date: API returns nearest date; UI shows "No data for X, showing Y".
- Axis has no sources: "View sources" / "Based on 0 sources"; panel shows empty state.
- Scrubber min/max from `/api/snapshot/range`; presets snap to nearest available date.
