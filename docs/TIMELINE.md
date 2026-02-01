# Timeline Page

Technical AI milestones timeline. See [docs/features/09-timeline-page.md](features/09-timeline-page.md) for full requirements.

## Overview

The Timeline page at `/timeline` displays reality-track events (technical milestones) from the `timeline_events` table. Users can explore decades of AI development, filter by category, search, and view event details in a side sheet.

## APIs

| Endpoint                   | Method | Query params                      | Description                                    |
| -------------------------- | ------ | --------------------------------- | ---------------------------------------------- |
| `/api/timeline`            | GET    | `start`, `end` (year), `category` | Events in date range, optional category filter |
| `/api/timeline/recent`     | GET    | `limit`                           | Recent events for home page preview            |
| `/api/timeline/event/[id]` | GET    | —                                 | Single event by ID                             |
| `/api/timeline/categories` | GET    | —                                 | Distinct categories (reality events only)      |
| `/api/timeline/search`     | GET    | `q`                               | Search title and description (ILIKE)           |

## Data Model

`timeline_events` table (see [DATABASE.md](DATABASE.md)):

- `date` — ISO date string
- `title`, `description` — Event content
- `eventType` — `reality` | `fiction` | `speculative` (page shows reality only)
- `category` — `benchmark` | `model` | `policy` | `research`
- `sourceUrl` — Optional citation link
- `axesImpacted` — Optional capability axes array

## Seed Data

`pnpm run db:seed` seeds 40+ historical AI milestones (1956–2025):

- **benchmark**: Deep Blue, Watson, ImageNet, AlphaGo, SWE-bench, ARC Prize, etc.
- **model**: BERT, GPT-2/3/4, Claude, Gemini, DALL-E, Codex, o1
- **policy**: Lighthill Report, OECD AI Principles, EU AI Act
- **research**: Dartmouth, Perceptron, ELIZA, Backpropagation, Transformer

## URL State

- `?event=<id>` — Opens detail sheet for event
- `?q=<keyword>` — Search query

## Components

- **TimelineVisualization** — Horizontal scroll with event markers, year axis, minimap
- **TimelineFilters** — Category checkboxes, search input
- **TimeNavigation** — Quick-jump buttons (2020, 2022, 2024, Today)
- **EventDetailSheet** — Shadcn Sheet with event details, source link, axes

## Design

- **Home preview** (`TimelinePreview`): Horizontal card strip; recent events from `/api/timeline/recent?limit=6`. Cards use `min-w-60` (240px), `gap-6`, and `line-clamp-2` for titles; full title on hover via `title`. Keeps the strip from feeling crowded.
- **Full timeline** (`TimelineVisualization`): Scale is 36px per year (1950–2030) so recent events spread out. Each event shows a dot plus a staggered label (date + truncated title, 28 chars); labels alternate above/below the track to reduce overlap. Full title and description in the detail sheet on click.
