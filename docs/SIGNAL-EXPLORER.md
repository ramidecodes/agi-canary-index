# Signal Explorer

Evidence exploration interface for auditing the data behind every metric. Enables filtering, exploration, and export of the signal database.

## Overview

The Signal Explorer page (`/signals`) lets researchers and journalists:

- Browse all extracted signals in a sortable, filterable table
- View full signal details including citations and source links
- Filter by capability axis, time range, source tier, confidence, and classification
- Export filtered results as CSV or JSON
- Click source names to filter by that source

## API Endpoints

| Endpoint              | Method | Description                                              |
| --------------------- | ------ | -------------------------------------------------------- |
| `/api/signals`        | GET    | Filtered signal list (explorer mode when `axis` omitted) |
| `/api/signals/[id]`   | GET    | Single signal detail with provenance                     |
| `/api/signals/export` | GET    | Export filtered signals (format=csv\|json)               |

### GET /api/signals (Explorer mode)

When `axis` is omitted, returns signals with full filter support.

**Query parameters:**

- `axes` — Comma-separated capability axes (e.g. `reasoning,planning`)
- `dateFrom` — Start date (YYYY-MM-DD)
- `dateTo` — End date (YYYY-MM-DD)
- `sourceTier` — TIER_0, TIER_1, DISCOVERY
- `sourceId` — Filter by specific source UUID
- `confidenceMin` — Minimum confidence (0–1)
- `hasBenchmark` — true (benchmarks only), false (claims only)
- `q` — Full-text search in claim summary
- `sort` — createdAt, confidence
- `order` — asc, desc
- `limit` — Max 500
- `offset` — Pagination offset

### GET /api/signals/export

Same filters as explorer mode. Adds:

- `format` — csv or json
- Cap: 10,000 rows

Returns file download with `Content-Disposition: attachment`.

## Components

- **SignalExplorerClient** — Main client with SWR, URL state sync, export handlers
- **SignalFilters** — Collapsible filter panel (axes, date range, tier, confidence, classification)
- **SignalListTable** — Table with columns: Date, Claim, Axes, Confidence, Type, Source
- **SignalDetailSheet** — Sheet with full details, citations, copy citation, source link

## URL State

Filters and selected signal are synced to URL for shareable links:

- `?axes=reasoning&dateFrom=2025-01-01`
- `?sourceId=uuid&signal=uuid` (signal detail open)

## Data Flow

1. Client builds `/api/signals?filters` from filter state
2. SWR fetches; results displayed in table
3. Row click opens SignalDetailSheet, fetches `/api/signals/[id]`
4. Export opens `/api/signals/export?format=csv|json&filters` in new tab

## Classification

Signals are classified as "benchmark" or "claim" based on presence of `metric` (benchmark data). This is inferred from the stored data; the extraction pipeline captures classification but it is not yet persisted separately.
