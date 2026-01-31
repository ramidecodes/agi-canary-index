# Timeline Page

## Goal

Create a dual-track timeline visualization that shows AI progress alongside cultural/fictional milestones—"Reality vs Fiction." This page must:

- Anchor hype in historical perspective
- Show technical milestones with citations
- Display fictional archetypes as cultural context (clearly labeled)
- Enable exploration across decades of AI development

This page helps users understand where we are by showing where we've been and what we've imagined.

## User Story

As a visitor interested in AI progress history, I want to explore a timeline of real technical milestones alongside fictional AI portrayals, so that I can contextualize current progress within broader historical and cultural narratives.

## Functional Requirements

1. **Dual-Track Timeline**

   - Two synchronized parallel tracks:
     - **Reality Track** (solid line, blue/white): Technical milestones
     - **Fiction Track** (dashed line, amber/purple): Cultural references
   - Vertical time axis (newest at top or scrollable horizontal)
   - Tracks aligned by year, independent within years

2. **Reality Track Events**

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

3. **Fiction Track Events**

   - Seminal AI portrayals (HAL-9000, Neuromancer, Her)
   - Archetypes: obedient assistant, misaligned operator, self-directed strategist
   - For each event:
     - Year (or decade for older works)
     - Title (work name)
     - AI archetype depicted
     - Brief cultural significance
   - Clearly labeled as "cultural reference, not evidence"

4. **Track Toggles**

   - [✓] Reality - Show/hide reality track
   - [✓] Fiction - Show/hide fiction track
   - [ ] Speculative - Show/hide future projections (optional)
   - Toggle state persisted in URL

5. **Time Navigation**

   - Scroll vertically or horizontally through time
   - Quick-jump buttons: 2020, 2022, 2024, Today
   - Mini-map showing position in full timeline
   - Keyboard navigation (arrow keys)

6. **Event Detail Panel**

   - Click event → side panel opens
   - Shows full description
   - For reality: source links, methodology notes
   - For fiction: cultural context, archetype explanation
   - Related events highlighted on timeline

7. **Filtering**

   - Filter by category:
     - Benchmarks
     - Model releases
     - Policy
     - Research
     - Fiction archetypes
   - Filter by axis impacted (for reality events)
   - Search by keyword

8. **Visual Hierarchy**
   - Major events: larger markers, prominent labels
   - Minor events: smaller markers, visible on zoom
   - Clusters: grouped when zoomed out, expand on zoom
   - Color coding by category

## Data Requirements

**Reads from Tables:**

- `timeline_events` - All timeline entries

**Seed Data Required:**

- Historical AI milestones (pre-tracker, manually curated)
- Fiction track entries (curated list of ~50 works)
- Key benchmarks and their introduction dates

**API Endpoints Needed:**

- `GET /api/timeline?start=1950&end=2026` - Events in range
- `GET /api/timeline/event/{id}` - Single event details
- `GET /api/timeline/categories` - Available filter categories
- `GET /api/timeline/search?q=keyword` - Search events

**Event Types (enum):**

- `reality` - Technical/factual events
- `fiction` - Cultural/fictional references
- `speculative` - Future projections (if enabled)

**Categories:**

- `benchmark` - Benchmark introductions/records
- `model` - Model releases
- `policy` - Policy and regulatory events
- `research` - Key papers and frameworks
- `archetype` - Fiction archetypes
- `media` - Films, books, games

## User Flow

### Exploring the Timeline

1. User navigates to `/timeline`
2. Timeline loads centered on recent events (2024-2026)
3. Both tracks visible by default
4. User scrolls down to see older events
5. User notices HAL-9000 (1968) on fiction track
6. User clicks event → detail panel opens
7. User reads cultural significance, closes panel

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
6. User disables fiction track for focus

### Finding Specific Event

1. User searches "ARC-AGI"
2. Results show ARC-AGI introduction, prize announcements
3. User clicks 2024 ARC Prize result
4. Detail panel shows: date, score, significance
5. Link to original source for verification

## Acceptance Criteria

- [ ] Dual-track timeline renders correctly
- [ ] Reality and Fiction tracks visually distinct
- [ ] Events clickable with detail panel
- [ ] Track toggles work and persist in URL
- [ ] Time navigation (scroll, jump, keyboard) works
- [ ] Filtering by category functions
- [ ] Search returns relevant events
- [ ] 50+ historical events seeded
- [ ] 30+ fiction entries curated
- [ ] Page loads in < 2 seconds
- [ ] Smooth scrolling/zooming (60fps)

## Edge Cases

1. **Dense period (many events same month)**

   - Expected behavior: Cluster markers, expand on zoom
   - Handling strategy: Intelligent grouping algorithm, "and X more" indicator

2. **Very old events (1950s-1980s)**

   - Expected behavior: Lower density, decade-level grouping
   - Handling strategy: Wider spacing, approximate dates acceptable

3. **Fiction date ambiguity (future-set works)**

   - Expected behavior: Place at publication date, note setting date
   - Handling strategy: "Published 1984, set 2019" in description

4. **Missing source links (old events)**

   - Expected behavior: Display event, note "historical record"
   - Handling strategy: Mark as manually curated, link to Wikipedia if available

5. **User expects real-time updates**

   - Expected behavior: Recent events appear after pipeline runs
   - Handling strategy: "Events added daily" note, last update timestamp

6. **Both tracks disabled**
   - Expected behavior: Empty state with explanation
   - Handling strategy: "Select at least one track" message

## Non-Functional Requirements

**Performance:**

- Initial load: < 2 seconds
- Scroll performance: 60fps
- Search response: < 500ms
- Event detail load: < 200ms

**Visual Design:**

- Reality track: solid markers, blue/white palette
- Fiction track: dashed line, amber/purple palette
- Clear visual separation between tracks
- Typography: dates in mono, titles in sans-serif
- Subtle grid lines for time reference

**Accessibility:**

- Timeline navigable via keyboard
- Events describable for screen readers
- Color not sole indicator of track type
- High contrast mode support

**Responsive:**

- Desktop: Horizontal scroll, both tracks side-by-side
- Tablet: Vertical scroll, tracks above/below
- Mobile: Vertical scroll, toggle between tracks

**Technical:**

- D3 or VisX for timeline visualization
- Virtual scrolling for performance
- SWR for data fetching
- URL state for shareable positions
- Intersection Observer for lazy loading events
