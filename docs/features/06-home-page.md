# Home Page (Control Room)

## Goal

Create the main landing page that serves as the "AGI Canary Control Room." This page must answer at a glance:

- Where are we in AGI progress?
- What moved recently?
- How confident are we in these assessments?
- Should we be concerned about autonomy/risk?

The home page is the signature experience of the AGI Canary Watcher—a serious scientific instrument, not a hype dashboard.

## UI Stack

Use **shadcn/ui** components where applicable (Button, Badge, Card, etc.) and **next-themes** for theme-aware styling. The app defaults to dark theme (Instrumental Minimalism).

## User Story

As a visitor to the AGI Canary Watcher, I want to see a comprehensive overview of current AI capability progress with confidence indicators, so that I can quickly understand where we are and what's changing.

## Functional Requirements

1. **Header Section**

   - Title: "AGI CANARY WATCHER" with live indicator
   - Subtitle: "Epistemic instrumentation for AGI progress"
   - Status bar: Last update timestamp, source count, coverage percentage

2. **Capability Radar (Primary Visual)**

   - Multi-axis radar chart showing 9 cognitive domains
   - Solid line: current estimated capability
   - Outer glow/blur: uncertainty range
   - Faded ghost lines: previous months for comparison
   - Click any axis → navigate to Capability Profile page
   - Subtle pulse animation when new data arrives

3. **Autonomy/Risk Thermometer**

   - Vertical gauge showing autonomy level
   - Labels: Non-agentic → Tool-using → Long-horizon → Self-directed
   - Never shows "AGI achieved"—always gradient language
   - Color gradient: blue (safe) → amber (watchful) → red (concerning)
   - Click → navigate to Autonomy & Risk page

4. **Canary Strip (Always Visible)**

   - Horizontal strip of 6-8 canary indicators
   - Each canary shows: icon, label, status color (🟢🟡🔴)
   - Core canaries:
     - ARC-AGI (generalization)
     - Long-Horizon (autonomy)
     - Tool Use (agentic capability)
     - Self-Improvement (recursive)
     - Economic Impact (displacement signals)
     - Alignment Coverage (eval coverage)
   - Hover → popover with details:
     - Status explanation
     - Last change date
     - Confidence score
     - Contributing sources
   - Sticky on scroll (always accessible)

5. **Today's Movement Section**

   - Short, editorial summary of changes
   - Format: ↑/↓ Axis +/-delta (source)
   - Include "no change" items for transparency
   - Maximum 5 items, prioritized by significance
   - Shareable/screenshot-ready design

6. **Timeline Preview**

   - Compact horizontal timeline (last 2 years)
   - Show recent milestones on Reality track
   - Scroll horizontally to explore
   - Click → navigate to full Timeline page
   - Markers for significant events

7. **Footer**
   - About link
   - Methodology explanation link
   - Data sources link
   - GitHub/open source link (if applicable)

## Data Requirements

**Reads from Tables:**

- `daily_snapshots` - Latest snapshot for current metrics
- `canary_definitions` - Canary configurations
- `timeline_events` - Recent events for preview
- `signals` - For "today's movement" detail

**API Endpoints Needed:**

- `GET /api/snapshot/latest` - Current daily snapshot
- `GET /api/snapshot/history?days=90` - For radar ghost lines
- `GET /api/canaries` - Canary statuses with details
- `GET /api/timeline/recent?limit=10` - Recent timeline events
- `GET /api/movement/today` - Today's significant changes

**State Management (Zustand):**

- Current snapshot data
- Selected time range for radar
- Hovered axis/canary for tooltips

**Data Fetching (Vercel):**

- App deploys to Vercel only. Use `@neondatabase/serverless` with Neon pooled `DATABASE_URL` for database access.

## User Flow

### First Visit

1. User lands on home page
2. Page loads with skeleton/loading states
3. Capability radar animates in (draw effect)
4. Canary strip populates with current statuses
5. Today's movement section fills in
6. User scans layout, understands current state

### Exploration Flow

1. User hovers over radar axis (e.g., "reasoning")
2. Tooltip shows: score, uncertainty, recent change, top sources
3. User clicks axis
4. Navigation to `/capabilities?axis=reasoning`
5. Deep-dive view opens with that axis highlighted

### Canary Investigation

1. User notices amber canary (e.g., "Long-Horizon 🟡")
2. User hovers canary
3. Popover shows:
   - "Long-horizon autonomy signals detected"
   - Last change: +0.03 (2 days ago)
   - Confidence: 0.71
   - Sources: METR, Anthropic blog
4. User clicks canary
5. Navigation to `/autonomy` with that canary highlighted

### Mobile Experience

1. User visits on mobile
2. Simplified layout: canary strip → radar snapshot → movement list
3. Radar is touch-interactive but smaller
4. Timeline hidden (link to full page instead)
5. "View full instrument" link to desktop version

## Acceptance Criteria

- [ ] Radar chart renders with all 9 axes
- [ ] Uncertainty bands visible as blur/glow effect
- [ ] Historical ghost lines show past 3 months
- [ ] Canary strip shows all configured canaries with correct colors
- [ ] Popover details load on hover within 100ms
- [ ] Today's movement shows actual pipeline results
- [ ] Timeline preview scrolls horizontally
- [ ] Page loads completely in < 2 seconds
- [ ] Mobile layout is usable and readable
- [ ] Accessibility: all interactive elements keyboard-navigable
- [ ] Animations respect prefers-reduced-motion

## Edge Cases

1. **No data available (first deploy)**

   - Expected behavior: Show "awaiting first data run" state
   - Handling strategy: Empty state with explanation, manual trigger option

2. **Stale data (pipeline hasn't run in 24+ hours)**

   - Expected behavior: Show warning banner, display last known data
   - Handling strategy: "Last updated X hours ago" warning, muted colors

3. **All canaries green**

   - Expected behavior: Normal display, not suspicious
   - Handling strategy: No special handling, this is a valid state

4. **All canaries red**

   - Expected behavior: Display accurately, don't editorialize
   - Handling strategy: Show data as-is, link to methodology

5. **Very low confidence across board**

   - Expected behavior: Blur effects more pronounced, coverage warning
   - Handling strategy: Visual uncertainty indicators, "low confidence" label

6. **User visits during pipeline run**
   - Expected behavior: Show current data, no disruption
   - Handling strategy: Pipeline updates happen atomically, next refresh shows new data

## Non-Functional Requirements

**Performance:**

- Initial page load: < 2 seconds (LCP)
- Time to interactive: < 3 seconds
- Radar animation: 60fps
- Data refresh: via SWR with 5-minute revalidation

**Visual Design:**

- Background: #0B0E11 (near-black)
- Primary text: #E6EDF3 (soft white)
- Accent: #4EA1FF (cold blue)
- Warning: #F4C430 (amber)
- Critical: #E5533D (muted red)
- Typography: Inter for headings, IBM Plex Mono for data
- Subtle noise texture (2-4% opacity)

**Accessibility:**

- WCAG 2.1 AA compliant
- All colors meet contrast requirements
- Screen reader descriptions for charts
- Keyboard navigation for all interactions

**Responsive:**

- Desktop: Full control room layout
- Tablet: Stacked layout, full radar
- Mobile: Simplified briefing view

**Technical:**

- Next.js 16 App Router, React 19 features (e.g. `use()`)
- React Server Components for initial render
- Client components for interactive elements
- D3 or VisX for radar chart
- Zustand for client state
- SWR for data fetching
- App deployed to Vercel only (hybrid architecture)
