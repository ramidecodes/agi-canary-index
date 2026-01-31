# Signal Explorer Page

## Goal

Create an evidence exploration interface that lets skeptics audit the data behind every metric. This page must:

- Show the provenance of all claims and scores
- Enable filtering and exploration of the signal database
- Build trust through transparency

This is where journalists, researchers, and skeptics will verify the AGI Canary Watcher's credibility.

**Scope:** Start with list view + filters + export. Graph visualization is a Phase 2 enhancement (see Future Enhancements).

## User Story

As a researcher or journalist verifying AGI Canary Watcher claims, I want to explore the underlying signals, their sources, and confidence scores, so that I can audit the methodology and cite specific evidence.

## Functional Requirements

1. **Signal List View (Primary)**

   - Sortable, filterable table of all signals
   - Columns:
     - Date extracted
     - Claim summary
     - Axes impacted
     - Confidence score
     - Source name
     - Classification type
   - Click row → expand detail view

2. **Filtering System**

   - By capability axis (checkboxes for 9 axes)
   - By time range (date picker)
   - By source tier (TIER_0, TIER_1, DISCOVERY)
   - By confidence level (slider: 0-1)
   - By classification (benchmark, research, opinion, etc.)
   - "High confidence only" quick filter

3. **Signal Detail Panel**

   - Expanded view of single signal:
     - Full claim summary
     - All axes impacted with magnitudes
     - Benchmark data if applicable
     - Confidence breakdown (AI confidence × source trust)
     - Citations with quoted text
     - Link to source document
     - Link to original URL
   - Related signals shown

4. **Source Profile (from list)**

   - Click source name in list → filter to signals from that source
   - Source profile panel shows:
     - All signals from this source
     - Trust tier and weight
     - Aggregate contribution stats

5. **Export Functionality**

   - Export filtered signals as CSV
   - Export as JSON for programmatic use
   - Copy citation for specific signal
   - Share link with filters applied

6. **Search**

   - Full-text search across claim summaries
   - Search source names
   - Search benchmark names
   - Results ranked by relevance and confidence

7. **Provenance Trail**
   - For any displayed metric on other pages
   - "How was this calculated?" link
   - Shows all contributing signals
   - Explains aggregation methodology

## Data Requirements

**Reads from Tables:**

- `signals` - All extracted signals
- `documents` - Source document metadata
- `items` - Original URLs
- `sources` - Source registry for trust info
- `daily_snapshots` - For linking metrics to signals

**API Endpoints Needed:**

- `GET /api/signals?filters` - Filtered signal list
- `GET /api/signals/{id}` - Single signal detail
- `GET /api/sources/{id}/signals` - Signals from specific source
- `GET /api/signals/export?filters&format=csv|json` - Export
- `GET /api/signals/search?q=query` - Full-text search

## User Flow

### Exploring Signals

1. User navigates to `/signals`
2. List view loads with recent signals
3. User scans table, sees claim summaries and sources
4. User clicks row → detail panel expands
5. User reads full claim, clicks source link

### Filtering for Audit

1. Journalist wants to audit "reasoning" claims
2. User opens filter panel
3. Selects: reasoning axis, TIER_0 sources only, high confidence
4. Graph/list updates to show filtered signals
5. User clicks "Export as CSV"
6. Downloads spreadsheet for analysis

### Verifying a Metric

1. User sees "Reasoning +0.04" on home page
2. User clicks provenance link (or navigates to /signals)
3. Filters to: reasoning, last 7 days
4. Sees 5 signals contributing to change
5. User clicks each to verify sources
6. Understands where +0.04 came from

### Source Deep-Dive

1. User notices many signals from "Stanford HAI"
2. User clicks source name or filters by source
3. Source profile panel shows:
   - All signals from Stanford HAI
   - TIER_0, trust weight 0.95
   - Aggregate stats
4. User can export or drill into individual signals

## Acceptance Criteria

- [ ] List view shows all signals with sorting
- [ ] All filters function correctly
- [ ] Filter combinations work (AND logic)
- [ ] Signal detail panel shows full information
- [ ] Source profile shows aggregate stats when filtering by source
- [ ] CSV export includes all filtered signals
- [ ] JSON export has correct structure
- [ ] Search returns relevant results
- [ ] Page handles 1000+ signals without lag (virtual list)
- [ ] Mobile: list view with simplified layout

## Edge Cases

1. **No signals match filters**

   - Expected behavior: Empty state with clear message
   - Handling strategy: "No signals found" with filter summary, reset link

2. **Conflicting signals (same topic, different conclusions)**

   - Expected behavior: Both shown, marked as conflicting
   - Handling strategy: Visual indicator for conflicts, both retain confidence

3. **Very low confidence signal**

   - Expected behavior: Shown if above 0.3, marked as low confidence
   - Handling strategy: Visual dimming, "Low confidence" badge

4. **Source URL no longer valid**

   - Expected behavior: Signal retained, link marked stale
   - Handling strategy: "Link may be unavailable" warning, cached metadata shown

5. **User exports very large dataset**

   - Expected behavior: Export works but may take time
   - Handling strategy: Progress indicator, cap at 10,000 rows with warning

## Non-Functional Requirements

**Performance:**

- Initial load: < 2 seconds
- Filter response: < 500ms
- Search response: < 500ms
- Export generation: < 5 seconds for 1000 signals

**Visual Design:**

- List view with clear row separation
- Consistent with overall app aesthetic

**Accessibility:**

- List view fully accessible
- Keyboard navigation for list
- Export available for screen reader users

**Responsive:**

- Desktop: Full list with sidebar filters
- Tablet: Stacked layout
- Mobile: List view with bottom sheet for filters

**Technical:**

- Next.js 16 App Router, React 19. App deployed to Vercel only.
- React-window for virtual list (1000+ rows)
- SWR for paginated data fetching
- URL state for shareable filters

## Future Enhancements

- **Signal Graph Visualization:** Network graph with nodes (signals, benchmarks, sources, organizations) and edges (supports, contradicts, cites). Requires D3/VisX force-directed layout, Web Worker for large graphs. Defer until list view proves insufficient for audit workflows.
