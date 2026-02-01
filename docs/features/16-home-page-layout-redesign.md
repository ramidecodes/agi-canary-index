# Home Page Layout Redesign

## Goal

Redesign the home page composition so that sections follow the Control Room questions in order and with proper visual weight: (1) Where are we? (2) Should we worry? (3) What moved? (4) Context. Primary content (Today's Movement and Autonomy Level) receives equal prominence; Timeline is framed as supporting context.

## User Story

As a visitor to the AGI Canary Watcher, I want the main content (what moved, autonomy level) to be easy to scan with equal weight, and the timeline to provide context without dominating the layout, so that I can quickly answer "what moved?" and "should we worry?" before exploring history.

## Functional Requirements

1. **Hero** — Unchanged: full-width radar + title ("AGI Canary Watcher"). Answers "where are we?"

2. **Canary strip** — Unchanged: full-width status (Updated, N sources, coverage) + canary pills. Always visible.

3. **Primary row** — Two equal columns (desktop: `lg:grid-cols-2`):

   - **Left:** Today's Movement (DailyBriefCard). Primary "what moved?" answer.
   - **Right:** Autonomy Level (AutonomyThermometer). "Should we worry?" answer.
   - Both columns visible on all breakpoints (stacked on mobile: Movement then Autonomy).

4. **Context row** — Full width:

   - Timeline (TimelineVisualization). Same component as timeline page; horizontal scroll, "View all" link to `/timeline`. Framed as supporting context, not main focus.

5. **Mobile layout** — Order: Hero → Strip → Today's Movement (full width) → Autonomy Level (full width, same component) → Timeline (full width) → "Full instrument" link. Autonomy must not be hidden on mobile.

6. **Skeleton** — Loading state matches layout: hero placeholder → strip placeholder → two equal-height blocks (primary row) → one full-width block (Timeline).

## Data Requirements

No new APIs. Layout only; data flow unchanged (SWR for snapshot, canaries, timeline, stats; autonomy data from `/api/autonomy/current` per feature 17).

## Acceptance Criteria

- [ ] Desktop: Primary row is two equal columns (Movement left, Autonomy right).
- [ ] Desktop: Timeline preview is full width below the primary row.
- [ ] Mobile: Movement and Autonomy both visible, stacked in that order.
- [ ] Mobile: Timeline visible below; no section hidden (Autonomy no longer `hidden lg:block`).
- [ ] Skeleton in `page.tsx` shows: hero → strip → two blocks → one full-width block.
- [ ] Reading order matches: Hero → Strip → Movement | Autonomy → Timeline.

## References

- [06-home-page.md](06-home-page.md) — Original home page FRED
- [17-home-autonomy-level-component.md](17-home-autonomy-level-component.md) — Autonomy data source and 5-level scale
- Plan: Home Page Redesign — Revised composition (primary row, context row)
