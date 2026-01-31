# Daily Brief & News Section

## Goal

Create a daily summary and news section that surfaces "what moved the needle" each day. This feature must:

- Provide a concise, editorial summary of daily changes
- List recent source articles with relevance explanations
- Be shareable and screenshot-ready
- Serve as the "news feed" for regular visitors

This feature transforms raw pipeline output into actionable intelligence for daily consumption.

## User Story

As a regular visitor to the AGI Canary Watcher, I want to see a daily summary of what changed and why, so that I can stay informed about AI progress without reading every source.

## Functional Requirements

1. **Daily Brief Card (Home Page)**

   - Compact summary visible on home page
   - Format: ↑/↓/→ Axis delta (source attribution)
   - Maximum 5 items, prioritized by significance
   - "No significant changes" state when applicable
   - Timestamp: "Updated X hours ago"

2. **Full News Page**

   - Dedicated `/news` page for complete view
   - Daily briefs archive (scrollable by date)
   - Individual source articles list
   - Filter by: axis, date range, source tier

3. **Brief Item Structure**

   - Direction indicator: ↑ (up), ↓ (down), → (stable)
   - Axis name (e.g., "Reasoning")
   - Delta value (e.g., "+0.04")
   - Primary source attribution
   - Confidence indicator (subtle)
   - Click → expand for details

4. **News Article List**

   - Recent processed articles
   - For each article:
     - Title
     - Source outlet
     - Published date
     - Tags (benchmark, policy, research, etc.)
     - "Why it matters" (1-2 sentences from AI extraction)
     - Confidence badge
     - Link to original
   - Sorted by: relevance to index, date, confidence

5. **Daily Archive**

   - Calendar/date picker to browse past briefs
   - Each day shows:
     - Brief summary
     - Coverage score for that day
     - Number of signals processed
   - Comparison: "vs previous day" delta indicators

6. **Sharing Features**

   - "Copy brief" button → formatted text for social
   - "Share link" → permalink to specific day
   - Social meta tags for link previews
   - Screenshot-friendly layout (clean, self-contained)

7. **Editorial Notes**

   - Occasional human-written context
   - "Editor's note: This week saw..."
   - Clearly marked as editorial, not automated
   - Stored in daily_snapshots.notes

8. **Coverage Reporting**
   - "Sources checked: X"
   - "Signals extracted: Y"
   - "Coverage score: Z%"
   - Transparency about what's missing

## Data Requirements

**Reads from Tables:**

- `daily_snapshots` - Brief data, notes, coverage
- `signals` - Individual signals for expansion
- `documents` - Article metadata for news list
- `items` - URLs and titles
- `sources` - Source names and tiers

**API Endpoints Needed:**

- `GET /api/brief/today` - Current day's brief
- `GET /api/brief/{date}` - Historical brief
- `GET /api/brief/archive?limit=30` - Recent briefs list
- `GET /api/news?limit=20&offset=0` - Paginated news articles
- `GET /api/news/filters` - Available filter options

**Brief Data Structure:**

```typescript
interface DailyBrief {
  date: string;
  movements: BriefItem[];
  coverageScore: number;
  signalsProcessed: number;
  sourcesChecked: number;
  notes: string[];
  generatedAt: string;
}

interface BriefItem {
  axis: string;
  direction: "up" | "down" | "stable";
  delta: number;
  source: string;
  confidence: number;
  signalId: string;
}
```

## User Flow

### Daily Check-In

1. User visits home page
2. Scans "Today's Movement" section
3. Sees: "↑ Reasoning +0.04 (Stanford HAI)"
4. Clicks item to expand
5. Expansion shows: full claim, source link, confidence
6. User clicks "View all" to go to /news

### Historical Browse

1. User navigates to `/news`
2. Default view: today's articles
3. User opens date picker
4. Selects last week
5. Brief archive shows each day's summary
6. User clicks specific day
7. Full brief + articles for that day load

### Sharing Findings

1. User sees significant change they want to share
2. Clicks "Copy brief" button
3. Formatted text copied:
   ```
   AGI Canary Watcher - Jan 30, 2026
   ↑ Reasoning +0.04 (Stanford HAI)
   ↑ Tool Use +0.02 (METR)
   → Planning (no change)
   https://canary.example.com/news/2026-01-30
   ```
4. User pastes to Twitter/LinkedIn

### Filtering News

1. User only cares about benchmarks
2. Opens filter dropdown
3. Selects: "Benchmarks only"
4. News list filters to benchmark articles
5. User browses relevant subset

## Acceptance Criteria

- [ ] Brief card renders on home page with current data
- [ ] Full news page loads with article list
- [ ] Brief items expandable for details
- [ ] Date archive navigable via picker
- [ ] Filters function correctly (axis, tier, type)
- [ ] "Copy brief" produces formatted text
- [ ] Share links work with proper meta tags
- [ ] Coverage metrics displayed accurately
- [ ] Editorial notes render when present
- [ ] Page loads in < 2 seconds
- [ ] Pagination works for large article lists

## Edge Cases

1. **No changes today**

   - Expected behavior: Show "No significant changes" state
   - Handling strategy: Still show coverage stats, list of articles processed

2. **Pipeline hasn't run yet today**

   - Expected behavior: Show yesterday's data with timestamp
   - Handling strategy: "Last updated: yesterday" warning

3. **All low confidence signals**

   - Expected behavior: Show with confidence warnings
   - Handling strategy: "Low confidence day" banner, visual uncertainty

4. **Very high volume day (many signals)**

   - Expected behavior: Summarize top 5, link to full list
   - Handling strategy: "and 12 more signals" expansion

5. **Source article removed (404)**

   - Expected behavior: Article shows, link marked stale
   - Handling strategy: "Original may be unavailable" note

6. **User visits very old date (before tracking)**

   - Expected behavior: "No data available" message
   - Handling strategy: Show available date range

7. **Copy fails (clipboard API blocked)**
   - Expected behavior: Show text in modal for manual copy
   - Handling strategy: Fallback to selectable text display

## Non-Functional Requirements

**Performance:**

- Brief card load: < 500ms
- News page load: < 2 seconds
- Pagination: < 500ms
- Archive navigation: < 500ms

**Visual Design:**

- Brief card: compact, scannable
- News list: clean rows, clear hierarchy
- Arrows and deltas: color-coded (green up, red down)
- Shareable: looks good when screenshotted
- Mobile: card-based layout

**SEO/Social:**

- Meta tags for each day's brief
- Open Graph images with summary
- Twitter card support
- Canonical URLs for archive pages

**Accessibility:**

- Direction indicated by text (not just arrows)
- News list keyboard-navigable
- Screen reader descriptions for metrics

**Technical:**

- Next.js 16 App Router, React 19. App deployed to Vercel only.
- SWR for data fetching with cache
- Pagination via cursor, not offset
- URL state for filters and date
- Static generation for archive pages (optional)
