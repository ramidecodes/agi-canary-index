# Home Page (Control Room)

Implementation of the main landing page—"AGI Canary Control Room"—as specified in [docs/features/06-home-page.md](features/06-home-page.md). Layout redesigned per [docs/features/16-home-page-layout-redesign.md](features/16-home-page-layout-redesign.md).

## Overview

The home page provides at-a-glance answers to:

- Where are we in AGI progress?
- What moved recently?
- How confident are we in these assessments?
- Should we be concerned about autonomy/risk?

**Layout (revised):** Hero → Canary strip → **Primary row** (Today's Movement | Autonomy Level, equal columns) → **Context row** (Timeline preview, full width). Movement and Autonomy are visible on all breakpoints (stacked on mobile). See [16-home-page-layout-redesign.md](features/16-home-page-layout-redesign.md).

## Components

| Component                            | Purpose                                                                                                                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HeroSection**                      | Title + CapabilityRadar (9 axes); click axis → `/capabilities?axis=...`                                                                                                                                    |
| **CanaryStrip**                      | Sticky strip of canary indicators; hover → popover with details                                                                                                                                            |
| **DailyBriefCard**                   | Today's Movement (primary "what moved?"); expandable items, "View all" to /news                                                                                                                            |
| **AutonomyThermometer**              | Vertical gauge (5 levels from `/api/autonomy/current`); click → `/autonomy`; see [17-home-autonomy-level-component.md](features/17-home-autonomy-level-component.md)                                       |
| **Timeline** (TimelineVisualization) | Same component as timeline page; left = older, right = newer; horizontal scroll; click event → `/timeline?event=id`; see [18-timeline-events-home-preview.md](features/18-timeline-events-home-preview.md) |

## API Endpoints

All public (no auth):

| Endpoint                            | Purpose                                            |
| ----------------------------------- | -------------------------------------------------- |
| `GET /api/snapshot/latest`          | Current daily snapshot                             |
| `GET /api/snapshot/history?days=90` | Snapshot history for radar ghost lines             |
| `GET /api/canaries`                 | Canary definitions with derived status             |
| `GET /api/autonomy/current`         | Current autonomy level, uncertainty, 5-level label |
| `GET /api/timeline/recent?limit=N`  | Recent **reality** timeline events (home preview)  |
| `GET /api/movement/today`           | Today's significant changes                        |
| `GET /api/stats`                    | Source count for header                            |

## Data Flow

- **SWR** fetches all data with 5-minute revalidation.
- **Zustand** (`useHomeStore`) manages: `selectedRadarAxis`, `hoveredCanaryId`, `radarDays`.
- **Empty state**: "Awaiting first data run" when no snapshot, canaries, or events.
- **Stale state**: Warning badge when last update > 24 hours.

## Capability Radar

- Uses declarative SVG (no D3 DOM manipulation); scales computed with trigonometry.
- 9 axes from `@/lib/signal/schemas` (reasoning, learning_efficiency, long_term_memory, planning, tool_use, social_cognition, multimodal_perception, robustness, alignment_safety).
- Current scores mapped from `(score + 1) / 2` (snapshot uses -1..1).
- Uncertainty shown as outer glow; ghost lines show past 3 months.

## Canary Strip

- Renders active canaries from `canary_definitions` ordered by `display_order`.
- Status derived from latest snapshot axis scores when not explicitly set in snapshot.
- Popover on hover with delay for mouse movement to content.

## Navigation

- `/capabilities`, `/autonomy`, `/timeline`, `/signals`, `/news` — main app pages.
- Footer links `/about`, `/methodology`, `/sources` — informational pages (implemented).
