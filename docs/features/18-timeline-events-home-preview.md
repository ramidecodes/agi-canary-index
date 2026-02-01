# Timeline Events — Home Preview

## Goal

The timeline on the home page uses the **same component** as the timeline page (`TimelineVisualization`): reality-track events only, with **left = older events, right = newer events**. Events stay up to date via seed data or a documented curation process. This aligns the home timeline with the Timeline page and product intent ("reality track" only).

## User Story

As a visitor on the home page, I want the timeline preview to show recent real AI milestones (reality events only), so that I get accurate context without fiction or speculative entries mixed in.

## Functional Requirements

1. **API filter** — `GET /api/timeline/recent?limit=N` must filter by `eventType = 'reality'` so that only reality-track events are returned. Other event types (fiction, speculative) are excluded from the home preview.

2. **Ordering** — API returns events by `date` descending. The home page sorts them **ascending** before passing to `TimelineVisualization`, so the timeline always displays **left = older, right = newer** (same as the timeline page).

3. **Limit** — Query parameter `limit` (default 10, max 50) unchanged. Home page continues to request `limit=6` (or similar) as needed.

4. **Seed / curation** — Timeline events are seeded in `src/lib/db/seed.ts`. To keep the timeline "up to date":

   - Seed includes curated reality events through the latest reasonable date (e.g. 2025).
   - Document that new events can be added by re-running seed (with new entries in `timelineSeedData`) or by a future admin/import process. No automated ingestion required for this feature.

5. **Timeline page** — Full timeline page at `/timeline` already filters by reality for the main view; home preview behavior is consistent.

## Data Requirements

- **Table:** `timeline_events` (see [DATABASE.md](../DATABASE.md)).
- **Filter:** `eventType = 'reality'` in the recent endpoint.
- **Seed:** Reality events in `src/lib/db/seed.ts`; add or update events as needed for current milestones.

## Acceptance Criteria

- [ ] `/api/timeline/recent` returns only rows where `eventType = 'reality'`.
- [ ] Home timeline preview shows only reality events (no fiction/speculative in the strip).
- [ ] Events remain ordered by date descending.
- [ ] Seed or docs mention how to add/update timeline events for new milestones.

## References

- [09-timeline-page.md](09-timeline-page.md) — Timeline page and reality track
- [TIMELINE.md](../TIMELINE.md) — Timeline APIs and data model
- [src/lib/db/seed.ts](/src/lib/db/seed.ts) — Timeline seed data
