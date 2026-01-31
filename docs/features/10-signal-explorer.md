# Signal Explorer Page

## Goal

Create an evidence exploration interface—"The Evidence Graph"—that lets skeptics audit the data behind every metric. This page must:

- Show the provenance of all claims and scores
- Enable filtering and exploration of the signal database
- Visualize relationships between claims, sources, and axes
- Build trust through transparency

This is where journalists, researchers, and skeptics will verify the AGI Canary Watcher's credibility.

## User Story

As a researcher or journalist verifying AGI Canary Watcher claims, I want to explore the underlying signals, their sources, and confidence scores, so that I can audit the methodology and cite specific evidence.

## Functional Requirements

1. **Signal Graph Visualization**

   - Network graph showing relationships:
     - ○ Circles: Claims/Signals
     - □ Squares: Benchmarks/Metrics
     - △ Triangles: Papers/Sources
     - ◇ Diamonds: Organizations (labs, institutions)
   - Edges show relationships: supports, contradicts, cites
   - Cluster by capability axis or time period
   - Hover → highlight connected nodes

2. **Signal List View**

   - Sortable, filterable table of all signals
   - Columns:
     - Date extracted
     - Claim summary
     - Axes impacted
     - Confidence score
     - Source name
     - Classification type
   - Click row → expand detail view

3. **Filtering System**

   - By capability axis (checkboxes for 9 axes)
   - By time range (date picker)
   - By source tier (TIER_0, TIER_1, DISCOVERY)
   - By confidence level (slider: 0-1)
   - By classification (benchmark, research, opinion, etc.)
   - "High confidence only" quick filter

4. **Signal Detail Panel**

   - Expanded view of single signal:
     - Full claim summary
     - All axes impacted with magnitudes
     - Benchmark data if applicable
     - Confidence breakdown (AI confidence × source trust)
     - Citations with quoted text
     - Link to source document
     - Link to original URL
   - Related signals shown

5. **Source Analysis**

   - Click source node → source profile:
     - All signals from this source
     - Trust tier and weight
     - Historical reliability
     - Topic coverage
   - Aggregate view of source contributions

6. **Export Functionality**

   - Export filtered signals as CSV
   - Export as JSON for programmatic use
   - Copy citation for specific signal
   - Share link with filters applied

7. **Search**

   - Full-text search across claim summaries
   - Search source names
   - Search benchmark names
   - Results ranked by relevance and confidence

8. **Provenance Trail**
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
- `GET /api/signals/graph?filters` - Graph data structure
- `GET /api/sources/{id}/signals` - Signals from specific source
- `GET /api/signals/export?filters&format=csv|json` - Export
- `GET /api/signals/search?q=query` - Full-text search

**Graph Data Structure:**

```typescript
interface GraphNode {
  id: string;
  type: "signal" | "benchmark" | "source" | "organization";
  label: string;
  metadata: Record<string, unknown>;
  x?: number; // for pre-computed layouts
  y?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: "supports" | "contradicts" | "cites" | "produces";
  weight?: number;
}
```

## User Flow

### Exploring the Graph

1. User navigates to `/signals`
2. Graph visualization loads with recent signals
3. User sees clusters around capability axes
4. User hovers over a signal node
5. Connected sources and benchmarks highlight
6. User clicks signal → detail panel opens
7. User reads full claim, clicks source link

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
2. User clicks Stanford HAI organization node
3. Source profile shows:
   - 47 signals total
   - TIER_0, trust weight 0.95
   - Topics: benchmarks, policy
4. User can explore all Stanford HAI contributions

## Acceptance Criteria

- [ ] Graph visualization renders with nodes and edges
- [ ] All 4 node types visually distinct
- [ ] Hover highlights connected nodes
- [ ] List view shows all signals with sorting
- [ ] All filters function correctly
- [ ] Filter combinations work (AND logic)
- [ ] Signal detail panel shows full information
- [ ] Source profile shows aggregate stats
- [ ] CSV export includes all filtered signals
- [ ] JSON export has correct structure
- [ ] Search returns relevant results
- [ ] Page handles 1000+ signals without lag
- [ ] Mobile shows list view (graph simplified)

## Edge Cases

1. **Very large graph (1000+ signals)**

   - Expected behavior: Virtual rendering, progressive loading
   - Handling strategy: Show most recent/relevant, "load more" option

2. **No signals match filters**

   - Expected behavior: Empty state with clear message
   - Handling strategy: "No signals found" with filter summary, reset link

3. **Conflicting signals (same topic, different conclusions)**

   - Expected behavior: Both shown, edge marked "contradicts"
   - Handling strategy: Visual indicator for conflicts, both retain confidence

4. **Very low confidence signal**

   - Expected behavior: Shown if above 0.3, marked as low confidence
   - Handling strategy: Visual dimming, "Low confidence" badge

5. **Source URL no longer valid**

   - Expected behavior: Signal retained, link marked stale
   - Handling strategy: "Link may be unavailable" warning, cached metadata shown

6. **User exports very large dataset**

   - Expected behavior: Export works but may take time
   - Handling strategy: Progress indicator, cap at 10,000 rows with warning

7. **Graph too dense to read**
   - Expected behavior: Zoom controls, clustering
   - Handling strategy: Force-directed layout, cluster expansion, zoom to fit

## Non-Functional Requirements

**Performance:**

- Initial load: < 3 seconds (graph + initial signals)
- Filter response: < 500ms
- Search response: < 500ms
- Export generation: < 5 seconds for 1000 signals

**Visual Design:**

- Graph on dark background, nodes as colored shapes
- List view with clear row separation
- Consistent with overall app aesthetic
- Graph should feel "alive" but not chaotic

**Accessibility:**

- List view fully accessible (primary)
- Graph has text alternatives
- Keyboard navigation for list
- Export available for screen reader users

**Responsive:**

- Desktop: Graph + list side-by-side or toggle
- Tablet: Tabbed graph/list view
- Mobile: List view only, graph disabled

**Technical:**

- D3 force-directed layout for graph
- React-window for virtual list
- SWR for paginated data fetching
- URL state for shareable filters
- Web Worker for large graph layouts
