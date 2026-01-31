# Timeline Page

## Goal

Create a timeline visualization that shows real AI progress milestones. This page must:

- Anchor hype in historical perspective
- Show technical milestones with citations
- Enable exploration across decades of AI development

**Scope:** Start with Reality track (technical milestones) only. Fiction track (cultural references) is a Phase 2 enhancement (see Future Enhancements).

## User Story

As a visitor interested in AI progress history, I want to explore a timeline of real technical milestones, so that I can contextualize current progress within historical context.

## Functional Requirements

1. **Reality Track (Technical Milestones)**

   - Benchmark achievements (ARC-AGI scores, SWE-bench jumps)
   - Model releases (GPT-4, Claude 3, Gemini)
   - Policy milestones (OECD indicators, AI Act)
   - Evaluation framework releases (METR, HELM)
   - Key research papers
   - For each event:
     - Date
     - Title
     - Brief description
     - Source link
     - Affected capability axes (optional)

2. **Time Navigation**

   - Scroll vertically or horizontally through time
   - Quick-jump buttons: 2020, 2022, 2024, Today
   - Mini-map showing position in full timeline
   - Keyboard navigation (arrow keys)

3. **Event Detail Panel**

   - Click event → side panel opens
   - Shows full description, source links, methodology notes
   - Related events highlighted on timeline

4. **Filtering**

   - Filter by category: Benchmarks, Model releases, Policy, Research
   - Filter by axis impacted
   - Search by keyword

5. **Visual Hierarchy**
   - Major events: larger markers, prominent labels
   - Minor events: smaller markers, visible on zoom
   - Clusters: grouped when zoomed out, expand on zoom
   - Color coding by category

## Data Requirements

**Reads from Tables:**

- `timeline_events` - All timeline entries

**Seed Data Required:**

- Historical AI milestones (pre-tracker, manually curated)
- Key benchmarks and their introduction dates

**API Endpoints Needed:**

- `GET /api/timeline?start=1950&end=2026` - Events in range
- `GET /api/timeline/event/{id}` - Single event details
- `GET /api/timeline/categories` - Available filter categories
- `GET /api/timeline/search?q=keyword` - Search events

**Event Types (enum):**

- `reality` - Technical/factual events (MVP)
- `speculative` - Future projections (optional, if enabled)

**Categories:**

- `benchmark` - Benchmark introductions/records
- `model` - Model releases
- `policy` - Policy and regulatory events
- `research` - Key papers and frameworks

## User Flow

### Exploring the Timeline

1. User navigates to `/timeline`
2. Timeline loads centered on recent events (2024-2026)
3. User scrolls through technical milestones
4. User clicks event → detail panel opens
5. User reads description and source links, closes panel

### Comparing Eras

1. User wants to see 2020 vs today
2. User clicks "2020" quick-jump button
3. Timeline scrolls to 2020
4. User notes GPT-3 release
5. User clicks "Today" to return
6. Comparison visible: dramatic change in 5 years

### Filtering for Research

1. Researcher wants only benchmark events
2. User opens filter panel
3. Selects: Benchmarks only
4. Timeline updates to show benchmark introductions
5. Clean view of evaluation history

### Finding Specific Event

1. User searches "ARC-AGI"
2. Results show ARC-AGI introduction, prize announcements
3. User clicks 2024 ARC Prize result
4. Detail panel shows: date, score, significance
5. Link to original source for verification

## Acceptance Criteria

- [ ] Reality track timeline renders correctly
- [ ] Events clickable with detail panel
- [ ] Time navigation (scroll, jump, keyboard) works
- [ ] Filtering by category functions
- [ ] Search returns relevant events
- [ ] 50+ historical reality events seeded
- [ ] Page loads in < 2 seconds
- [ ] Smooth scrolling/zooming (60fps)

## Edge Cases

1. **Dense period (many events same month)**

   - Expected behavior: Cluster markers, expand on zoom
   - Handling strategy: Intelligent grouping algorithm, "and X more" indicator

2. **Very old events (1950s-1980s)**

   - Expected behavior: Lower density, decade-level grouping
   - Handling strategy: Wider spacing, approximate dates acceptable

3. **Missing source links (old events)**

   - Expected behavior: Display event, note "historical record"
   - Handling strategy: Mark as manually curated, link to Wikipedia if available

4. **User expects real-time updates**
   - Expected behavior: Recent events appear after pipeline runs
   - Handling strategy: "Events added daily" note, last update timestamp

## Non-Functional Requirements

**Performance:**

- Initial load: < 2 seconds
- Scroll performance: 60fps
- Search response: < 500ms
- Event detail load: < 200ms

**Visual Design:**

- Solid markers, blue/white palette
- Typography: dates in mono, titles in sans-serif
- Subtle grid lines for time reference

**Accessibility:**

- Timeline navigable via keyboard
- Events describable for screen readers
- High contrast mode support

**Responsive:**

- Desktop: Horizontal scroll
- Tablet: Vertical scroll
- Mobile: Vertical scroll

**Technical:**

- Next.js 16 App Router, React 19. App deployed to Vercel only.
- D3 or VisX for timeline visualization
- Virtual scrolling for performance
- SWR for data fetching
- URL state for shareable positions
- Intersection Observer for lazy loading events

## Future Enhancements

- **Fiction Track:** Cultural/fictional AI portrayals (HAL-9000, Neuromancer, Her, etc.) as a second parallel track. Requires curated seed data (~50 works), archetype classification, "cultural reference, not evidence" labeling. Defer until Reality track is stable and curation capacity exists.
