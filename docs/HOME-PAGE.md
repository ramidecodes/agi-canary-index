# Home Page (Control Room)

Implementation of the main landing page—"AGI Canary Control Room"—as specified in [docs/features/06-home-page.md](features/06-home-page.md).

## Overview

The home page provides at-a-glance answers to:

- Where are we in AGI progress?
- What moved recently?
- How confident are we in these assessments?
- Should we be concerned about autonomy/risk?

## Components

| Component               | Purpose                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------- |
| **HomeHeader**          | Title, live indicator, status bar (last update, source count, coverage)             |
| **CapabilityRadar**     | Multi-axis radar chart (9 cognitive domains); click axis → `/capabilities?axis=...` |
| **AutonomyThermometer** | Vertical gauge (Non-agentic → Self-directed); click → `/autonomy`                   |
| **CanaryStrip**         | Sticky strip of canary indicators; hover → popover with details                     |
| **TodaysMovement**      | Editorial summary of changes (↑/↓ per axis)                                         |
| **TimelinePreview**     | Horizontal scroll of recent milestones; click → `/timeline`                         |
| **HomeFooter**          | About, Methodology, Data sources, GitHub links                                      |

## API Endpoints

All public (no auth):

| Endpoint                            | Purpose                                |
| ----------------------------------- | -------------------------------------- |
| `GET /api/snapshot/latest`          | Current daily snapshot                 |
| `GET /api/snapshot/history?days=90` | Snapshot history for radar ghost lines |
| `GET /api/canaries`                 | Canary definitions with derived status |
| `GET /api/timeline/recent?limit=10` | Recent timeline events                 |
| `GET /api/movement/today`           | Today's significant changes            |
| `GET /api/stats`                    | Source count for header                |

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

- `/capabilities`, `/autonomy`, `/timeline` are placeholders until Phase 3.2–4.2.
- Footer links `/about`, `/methodology`, `/sources` are placeholders.
