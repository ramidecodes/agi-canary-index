# Autonomy & Risk Page

## Goal

Create a dedicated view for autonomy and risk-related canary indicators—"The Canary Cage." This page must:

- Separate impressive demos from genuine agentic capability
- Track long-horizon autonomy indicators
- Surface risk-related evaluation coverage
- Communicate uncertainty without alarmism or dismissiveness

This page should feel "slightly uncomfortable"—it's tracking signals that matter for safety without being sensationalist.

## User Story

As a safety researcher or policymaker, I want to monitor autonomy and risk-related AI capability signals separately from general capability progress, so that I can track early warning indicators for concerning capabilities.

## Functional Requirements

1. **Page Header**

   - Title: "Autonomy & Risk"
   - Subtitle: "Long-horizon agency indicators"
   - Last updated timestamp
   - Link to methodology/definitions

2. **Autonomy Scale (Primary Visual)**

   - Vertical gauge showing current autonomy level
   - Scale labels (bottom to top):
     - Tool-only (Level 0)
     - Scripted agent (Level 1)
     - Adaptive agent (Level 2)
     - Long-horizon agent (Level 3)
     - Self-directed (Level 4)
   - Current position shown with marker
   - Uncertainty range as blurred zone
   - Never shows "AGI"—always capability gradient

3. **Risk canaries Panel**

   - Grid/list of risk-related canaries:
     - Long-horizon planning 🟡
     - Recursive self-improvement 🔴
     - Economic displacement 🟡
     - Alignment eval coverage 🟢
     - Deception detection 🟡
     - Tool creation capability 🟡
   - Each canary shows:
     - Status color and label
     - Brief description
     - Last change date and direction
     - Confidence indicator
   - Click → expand to full detail

4. **Trigger Log**

   - "What triggered this?" section
   - List of recent signals that affected autonomy/risk canaries
   - For each trigger:
     - Source name and date
     - Brief description
     - Which canaries affected
     - Link to source
   - Chronological, most recent first

5. **Evaluation Coverage Meter**

   - Shows how well current autonomy is being evaluated
   - Breakdown by eval type:
     - METR task suites
     - Red team evaluations
     - Long-horizon benchmarks
     - Deception tests
   - "Coverage gaps" highlighted
   - Links to evaluation methodology sources

6. **Historical Autonomy Chart**

   - Line chart showing autonomy level over time
   - Confidence bands as shaded area
   - Markers for significant events
   - Tooltip on hover: date, level, key trigger

7. **Interpretation Guide**
   - Collapsible section explaining:
     - What each autonomy level means
     - What the canaries are tracking
     - How to interpret uncertainty
     - What this does NOT tell you
   - Written in plain language, not jargon

## Data Requirements

**Reads from Tables:**

- `daily_snapshots` - For autonomy metrics and canary statuses
- `canary_definitions` - Where axes_watched includes autonomy-related axes
- `signals` - Signals impacting tool_use, planning, alignment_safety
- `timeline_events` - For historical chart markers

**API Endpoints Needed:**

- `GET /api/autonomy/current` - Current autonomy level and uncertainty
- `GET /api/canaries?type=risk` - Risk-related canaries only
- `GET /api/signals/recent?axes=tool_use,planning,alignment_safety` - Recent triggers
- `GET /api/autonomy/history` - Historical autonomy levels
- `GET /api/coverage/autonomy` - Evaluation coverage metrics

**Canary Definitions (Risk-Related):**

- `long_horizon` - Long-horizon planning capability
- `self_improvement` - Recursive self-improvement signals
- `economic_impact` - Economic displacement indicators
- `alignment_coverage` - How well-tested is alignment
- `deception` - Deception/manipulation detection
- `tool_creation` - Ability to create new tools/code

## User Flow

### Initial Assessment

1. User navigates to `/autonomy`
2. Page loads with autonomy gauge as focal point
3. User immediately sees current level (e.g., "Adaptive agent")
4. Risk canaries visible with status colors
5. User scans for any red indicators
6. User understands current autonomy state

### Investigating a Concern

1. User notices "Self-improvement 🔴" canary
2. User clicks canary to expand
3. Detail panel shows:
   - "Signals suggest improved ability to modify own code"
   - Confidence: 0.54 (moderate)
   - Last change: +0.12 (5 days ago)
   - Triggers: Paper from DeepMind, agent demo
4. User clicks trigger source
5. External source opens for verification

### Understanding Context

1. User sees autonomy level higher than expected
2. User scrolls to "What triggered this?"
3. Sees: METR task suite v3 results, 24h+ autonomous demo
4. User clicks "Interpretation Guide"
5. Reads explanation of what this means and doesn't mean
6. User has better calibrated understanding

### Historical Analysis

1. User wants to see trend over time
2. User scrolls to historical chart
3. Chart shows gradual increase with confidence bands
4. Markers indicate key events
5. User hovers on spike: "Agent X demo, March 2025"
6. User understands trajectory

## Acceptance Criteria

- [ ] Autonomy gauge renders with correct level and uncertainty
- [ ] All risk canaries display with accurate statuses
- [ ] Canary expansion shows detailed trigger information
- [ ] Trigger log shows recent signals affecting autonomy
- [ ] Coverage meter shows evaluation gaps
- [ ] Historical chart renders with confidence bands
- [ ] Interpretation guide is accessible and clear
- [ ] Page loads in < 2 seconds
- [ ] External links open in new tab
- [ ] Mobile layout preserves critical information

## Edge Cases

1. **No autonomy signals (early stage)**

   - Expected behavior: Show "Insufficient data" state
   - Handling strategy: Placeholder with explanation, no false readings

2. **All risk canaries green**

   - Expected behavior: Display normally, don't suggest complacency
   - Handling strategy: Still show coverage gaps, "absence of evidence" note

3. **Conflicting signals (capability vs evaluation)**

   - Expected behavior: Show both, note conflict
   - Handling strategy: Wider uncertainty, "conflicting signals" label

4. **Very low evaluation coverage**

   - Expected behavior: Prominent warning, reduced confidence
   - Handling strategy: Coverage meter highlighted, autonomy gauge blurred

5. **Sudden jump in autonomy level**

   - Expected behavior: Display accurately, highlight triggers
   - Handling strategy: Visual emphasis on change, automatic trigger expansion

6. **User misinterprets as "AGI imminent"**
   - Expected behavior: Guide prevents misinterpretation
   - Handling strategy: Clear language in guide, "what this doesn't mean" section

## Non-Functional Requirements

**Performance:**

- Page load: < 2 seconds
- Canary expansion: < 200ms
- Chart render: < 500ms

**Visual Design:**

- Darker tone than capabilities page (slightly more serious)
- Autonomy gauge: vertical, prominent
- Risk canaries: clear status colors, not overwhelming
- Subtle red accents only where warranted
- No gamification or sensationalism

**Accessibility:**

- Gauge levels describable for screen readers
- Canary statuses have text labels (not color alone)
- Chart data available in table format

**Responsive:**

- Desktop: Gauge and canaries side-by-side
- Tablet: Stacked layout
- Mobile: Gauge simplified, canaries as list

**Tone:**

- Serious but not alarmist
- Factual, not speculative
- Uncertainty always visible
- Links to methodology throughout

**Technical:**

- Next.js 16 App Router, React 19. App deployed to Vercel only.
- **Gauge:** Custom SVG or D3 (vertical autonomy scale).
- **Historical autonomy chart:** **Recharts** (LineChart, Area for confidence bands).
- SWR for data fetching.
- Zustand for expansion state.
- URL params for shareable state.
