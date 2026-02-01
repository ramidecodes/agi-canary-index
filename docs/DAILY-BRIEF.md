# Daily Brief & News

Daily summary and news section: "what moved the needle" each day. See [docs/features/11-daily-brief.md](features/11-daily-brief.md) for full requirements.

## Implemented

- **Home:** Daily Brief card (Today's Movement) with expandable items, coverage stats (sources checked, signals, coverage %), "View all → News" link. Uses `/api/brief/today`.
- **News page:** `/news` — date selector (from archive), brief for selected date, "Copy brief" and "Share link", filters (axis, source tier, date range), paginated article list with "Load more". URL state: `?date=`, `?axis=`, `?sourceTier=`, `?dateFrom=`, `?dateTo=`.
- **APIs:**
  - `GET /api/brief/today` — today's brief (movements, coverageScore, signalsProcessed, sourcesChecked, generatedAt).
  - `GET /api/brief/[date]` — brief for YYYY-MM-DD (nearest snapshot if no exact date).
  - `GET /api/brief/archive?limit=30` — recent briefs (date, coverageScore, signalsProcessed, movementCount).
  - `GET /api/news?limit=20&cursor=&dateFrom=&dateTo=&axis=&sourceTier=` — cursor-paginated news articles (one per processed document, primary signal for "why it matters").
  - `GET /api/news/filters` — axes, date range (min/max), source tiers.
- **Sharing:** Copy brief formats as plain text (title, movements, permalink). Share link is `/news?date=YYYY-MM-DD`. Fallback modal if clipboard is unavailable.
- **Data:** Brief movements built from `daily_snapshots` (axisScores, signalIds) with source/confidence from signals → documents → items → sources. News articles from signals grouped by document (best signal per document).

## Stack

- Next.js 16 App Router, SWR for data, URL state for filters/date.
- Components: `DailyBriefCard` (home), `NewsPageClient`, `CopyBriefButton`, `NewsArticleList`.
