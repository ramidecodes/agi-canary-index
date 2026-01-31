# Capability Profile Page

## Goal

Create a deep-dive view into the AI capability profile—the "Cognitive Fingerprint" of current AI systems. This page must:

- Show detailed breakdown of each cognitive domain
- Enable time-travel through historical data
- Reveal the sources behind each axis score
- Communicate uncertainty and gaps in evaluation coverage

This page is where researchers and journalists will spend time understanding the nuances behind the headline numbers.

## User Story

As a researcher or journalist investigating AI progress, I want to explore detailed capability metrics across cognitive domains with historical context, so that I can understand trends and verify claims.

## Functional Requirements

1. **Large Capability Radar**

   - Expanded version of home page radar
   - All 9 cognitive axes clearly labeled
   - Solid line: current estimated capability
   - Outer glow: uncertainty band (wider = less certain)
   - Ghost outlines: past 3 months (faded, interactive)
   - Click axis → scroll to domain breakdown

2. **Time Scrubber**

   - Horizontal slider spanning available data range
   - Drag to change displayed time point
   - Radar morphs smoothly as time changes
   - Labels show: selected date, "X days ago"
   - Preset buttons: Today, 1 month ago, 3 months ago, 1 year ago

3. **Domain Breakdown Section**

   - Vertical list of all 9 axes
   - For each axis:
     - Name and description
     - Progress bar showing score (0-100% scale)
     - Delta indicator: +0.04 ↑ or -0.02 ↓ or → (stable)
     - Uncertainty range shown as bar width variation
     - "Based on X sources" link
   - Sort options: alphabetical, by score, by recent change

4. **Source Map Panel**

   - Shows benchmarks, papers, reports affecting displayed scores
   - Grouped by axis or by source type
   - Each source shows:
     - Title and outlet
     - Date published
     - Which axes it impacts
     - Confidence contribution
   - Click source → external link (new tab)

5. **Axis Detail Modal/Panel**

   - Opens when clicking specific axis
   - Shows:
     - Full description of what this axis measures
     - Historical chart (line graph over time)
     - Key benchmarks that inform this axis
     - Recent signals affecting score
     - Related canaries
   - Close button returns to main view

6. **Toggle Filters**

   - "Benchmarks only" - show only benchmark-backed scores
   - "Include claims" - add research/report signals
   - "Show speculative" - include opinion/extrapolation signals
   - Filter affects both radar and breakdown

7. **Comparison Mode**
   - Select two time points
   - Radar shows both overlaid (solid vs dashed)
   - Breakdown shows side-by-side with diff highlighting
   - Useful for: "How much changed in 6 months?"

## Data Requirements

**Reads from Tables:**

- `daily_snapshots` - Historical axis scores
- `signals` - Individual claims for source map
- `documents` - Source metadata
- `sources` - Trust weights and names

**API Endpoints Needed:**

- `GET /api/snapshot/{date}` - Snapshot for specific date
- `GET /api/snapshot/range?start=X&end=Y` - Range for time scrubber
- `GET /api/axis/{axis}/history` - Historical data for single axis
- `GET /api/axis/{axis}/sources` - Sources contributing to axis
- `GET /api/signals?axis=X&date=Y` - Signals for specific axis/date

**State Management (Zustand):**

- Selected date (controlled by scrubber)
- Active axis (for detail view)
- Filter toggles state
- Comparison mode dates

## User Flow

### Exploring Current State

1. User navigates to `/capabilities` (from home radar click)
2. Page loads with latest snapshot displayed
3. Large radar visible with current capability profile
4. User scans domain breakdown list
5. User clicks "reasoning" axis on radar
6. Page scrolls to reasoning in breakdown, highlights it
7. User clicks "View details" on reasoning
8. Modal opens with reasoning history chart

### Time Travel Analysis

1. User wants to see 6-month change
2. User drags time scrubber to 6 months ago
3. Radar smoothly morphs to historical shape
4. Domain breakdown updates with historical values
5. User notices "planning" was much lower
6. User clicks "planning" to see detailed history
7. Line chart shows planning improvement over time

### Source Verification

1. Journalist wants to verify "reasoning" score
2. User clicks "Based on 12 sources" under reasoning
3. Source map panel expands
4. Shows: Stanford AI Index, HELM benchmark, 3 papers
5. User clicks Stanford AI Index entry
6. External link opens to actual source
7. Journalist can verify claim

### Comparison Mode

1. User enables comparison mode
2. Selects: Today vs 1 year ago
3. Radar shows both profiles overlaid
4. Significant differences highlighted
5. Breakdown shows delta columns
6. User identifies biggest improvements and gaps

## Acceptance Criteria

- [ ] Radar renders with all 9 axes and uncertainty bands
- [ ] Time scrubber controls displayed data smoothly
- [ ] Ghost lines show historical profiles
- [ ] Domain breakdown updates with scrubber
- [ ] Sort options work correctly
- [ ] Source map shows relevant sources per axis
- [ ] Axis detail modal shows historical chart
- [ ] Filter toggles affect displayed data
- [ ] Comparison mode renders dual profiles
- [ ] External source links work (new tab)
- [ ] Page loads in < 2 seconds
- [ ] Animations are 60fps smooth

## Edge Cases

1. **No data for selected date**

   - Expected behavior: Show nearest available date, indicate gap
   - Handling strategy: Snap to nearest date, show "No data for X, showing Y"

2. **Axis has no sources**

   - Expected behavior: Show score with "Low coverage" warning
   - Handling strategy: Display but with visual uncertainty, link to methodology

3. **Very old data requested (before tracking)**

   - Expected behavior: Scrubber stops at earliest available date
   - Handling strategy: Min date on scrubber, "Data available from X"

4. **Single source dominates axis**

   - Expected behavior: Display accurately, note concentration
   - Handling strategy: "Based on 1 source" warning, recommend verification

5. **Conflicting sources**

   - Expected behavior: Show weighted average, note uncertainty
   - Handling strategy: Wider uncertainty band, "Conflicting signals" note

6. **Source link broken (404)**
   - Expected behavior: Show source info, indicate link may be stale
   - Handling strategy: Link still clickable, cached metadata displayed

## Non-Functional Requirements

**Performance:**

- Initial load: < 2 seconds
- Time scrubber response: < 100ms
- Radar animation: 60fps
- Source map load: < 500ms

**Visual Design:**

- Consistent with home page (same colors, typography)
- Radar larger (60% of viewport width on desktop)
- Clear visual hierarchy: radar → breakdown → sources
- Subtle depth via shadows, not borders

**Accessibility:**

- Time scrubber keyboard-operable
- Axis descriptions available to screen readers
- Chart data available in table format
- High contrast mode support

**Responsive:**

- Desktop: Side-by-side layout (radar + breakdown)
- Tablet: Stacked with tabs (radar tab, breakdown tab)
- Mobile: Simplified list view, radar accessible via scroll

**Technical:**

- D3/VisX for radar and line charts
- React transition for radar morphing
- SWR for data fetching with caching
- URL state for shareable views (?date=2025-01-01&axis=reasoning)
