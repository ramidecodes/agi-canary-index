# Database Schema & Core Models

## Goal

Establish the foundational data structures that power the AGI Canary Watcher. This schema must support:

- Tracking AI capability progress across multiple cognitive domains
- Storing evidence with full provenance and confidence scores
- Enabling audit trails for all displayed metrics
- Supporting time-series analysis of capability changes

Without a solid data foundation, the application cannot deliver on its core promise of rigorous, evidence-based AGI progress tracking.

## User Story

As a developer building the AGI Canary Watcher, I want a well-structured database schema, so that I can store, query, and display capability metrics with full traceability and confidence scoring.

## Functional Requirements

1. **Cognitive Axis Representation**

   - Support 9 core capability axes: reasoning, learning_efficiency, long_term_memory, planning, tool_use, social_cognition, multimodal_perception, robustness, alignment_safety
   - Allow axis scores with uncertainty ranges (0-1 scale)
   - Track score provenance (which claims/sources contributed)

2. **Source Management**

   - Store trusted sources with tier classification (TIER_0, TIER_1, DISCOVERY)
   - Track source metadata: trust weight, cadence, domain type
   - Support source health monitoring (last successful fetch, error counts)

3. **Content Storage**

   - Store discovered URLs with deduplication
   - Link to raw/clean content in object storage (R2)
   - Track processing status through pipeline stages

4. **Signal Extraction**

   - Store structured claims extracted from content
   - Map claims to affected capability axes
   - Include confidence scores and uncertainty estimates

5. **Daily Snapshots**

   - Aggregate daily state of all capability axes
   - Store canary status indicators
   - Enable historical comparison and trend analysis

6. **Audit Trail**
   - Every displayed metric must be traceable to source claims
   - Support scoring version tracking for reprocessing
   - Maintain full history without data loss

## Data Requirements

**New Tables:**

### `sources`

Trusted data sources for the pipeline.

- `id` (uuid, PK): Unique identifier
- `name` (varchar): Human-readable source name
- `url` (varchar): Base URL or feed URL
- `tier` (enum: TIER_0, TIER_1, DISCOVERY): Trust level
- `trust_weight` (decimal 0-1): Confidence multiplier
- `cadence` (enum: daily, weekly, monthly): Expected update frequency
- `domain_type` (enum: evaluation, policy, research, commentary): Content type
- `source_type` (enum: rss, search, curated, api, x): How to fetch (`x` = X/Twitter via Grok, optional)
- `query_config` (jsonb): Source-specific configuration
- `is_active` (boolean): Whether to include in pipeline runs
- `last_success_at` (timestamp): Last successful fetch
- `error_count` (integer): Consecutive failures
- `created_at` (timestamp)
- `updated_at` (timestamp)

### `pipeline_runs`

Track each execution of the data pipeline.

- `id` (uuid, PK): Unique identifier
- `started_at` (timestamp): Run start time
- `completed_at` (timestamp, nullable): Run completion time
- `status` (enum: running, completed, failed): Current state
- `items_discovered` (integer): URLs found
- `items_processed` (integer): Items successfully processed
- `items_failed` (integer): Items that errored
- `error_log` (text, nullable): Error details if failed
- `scoring_version` (varchar): Version of scoring logic used

### `items`

Discovered URLs awaiting or completed processing.

- `id` (uuid, PK): Unique identifier
- `run_id` (uuid, FK → pipeline_runs): Which run discovered this
- `source_id` (uuid, FK → sources): Origin source
- `url` (varchar, unique): Canonical URL
- `url_hash` (varchar, indexed): For fast deduplication
- `title` (varchar, nullable): Extracted title
- `discovered_at` (timestamp): When URL was found
- `status` (enum: pending, acquired, processed, failed): Pipeline stage
- `published_at` (timestamp, nullable): Content publication date

### `documents`

Acquired and processed content.

- `id` (uuid, PK): Unique identifier
- `item_id` (uuid, FK → items): Parent item
- `raw_blob_key` (varchar, nullable): R2 key for raw HTML
- `clean_blob_key` (varchar, nullable): R2 key for clean markdown
- `extracted_metadata` (jsonb): Author, outlet, dates, etc.
- `word_count` (integer, nullable): Content length
- `acquired_at` (timestamp): When content was fetched
- `processed_at` (timestamp, nullable): When AI extraction ran

### `signals`

Structured claims extracted from documents.

- `id` (uuid, PK): Unique identifier
- `document_id` (uuid, FK → documents): Source document
- `claim_summary` (text): Human-readable claim description
- `axes_impacted` (jsonb): Array of {axis, direction, magnitude, uncertainty}
- `metric` (jsonb, nullable): {name, value, unit} if benchmark result
- `confidence` (decimal 0-1): Extraction confidence
- `citations` (jsonb): Array of {url, quoted_span}
- `scoring_version` (varchar): Logic version that produced this
- `created_at` (timestamp)

### `daily_snapshots`

Aggregated daily state for display.

- `id` (uuid, PK): Unique identifier
- `date` (date, unique): Snapshot date
- `axis_scores` (jsonb): Record<Axis, {score, uncertainty, delta}>
- `canary_statuses` (jsonb): Array of {canary_id, status, last_change, confidence}
- `coverage_score` (decimal 0-1): How well-tested is current state
- `signal_ids` (uuid[]): Contributing signals
- `notes` (text[], optional): Reserved for future editorial context; not used in MVP
- `created_at` (timestamp)

### `canary_definitions`

Configuration for canary indicators.

- `id` (varchar, PK): Canary identifier (e.g., "arc_agi", "long_horizon")
- `name` (varchar): Display name
- `description` (text): What this canary measures
- `axes_watched` (varchar[]): Which axes affect this canary
- `thresholds` (jsonb): {green, yellow, red} threshold definitions
- `display_order` (integer): Position in canary strip
- `is_active` (boolean): Whether to show in UI

### `timeline_events`

Events for the timeline visualization.

- `id` (uuid, PK): Unique identifier
- `date` (date): Event date
- `title` (varchar): Event title
- `description` (text): Event description
- `event_type` (enum: reality, fiction, speculative): Track type
- `category` (varchar): Grouping (benchmark, policy, archetype, etc.)
- `source_url` (varchar, nullable): Reference link
- `axes_impacted` (varchar[], nullable): For reality events
- `created_at` (timestamp)

**Relationships:**

- `sources` → `items` (one-to-many)
- `pipeline_runs` → `items` (one-to-many)
- `items` → `documents` (one-to-one)
- `documents` → `signals` (one-to-many)
- `daily_snapshots` → `signals` (many-to-many via signal_ids)

**Indexes:**

- `items.url_hash` for deduplication lookups
- `items.status` for pipeline queries
- `signals.document_id` for joins
- `daily_snapshots.date` for time-series queries
- `timeline_events.date` for timeline rendering

**Neon (Vercel):**

- Pipeline and app connect to Neon via [Neon serverless driver](https://neon.tech/docs/guides/vercel) (`@neondatabase/serverless`)
- Use `DATABASE_URL` (Neon pooled connection string) in Vercel env
- Use `drizzle-orm/neon-http` with `neon()` for Drizzle

## User Flow

N/A - This is an infrastructure feature. The schema is consumed by the pipeline and UI features.

## Acceptance Criteria

- [ ] All tables created with proper constraints and indexes
- [ ] Drizzle ORM schema definitions export TypeScript interfaces
- [ ] Zod schemas available for runtime validation
- [ ] Migrations run successfully on Neon Postgres
- [ ] RLS policies defined for all tables (if using Supabase auth later)
- [ ] Seed data script creates realistic test data
- [ ] Query performance: simple lookups < 50ms, aggregations < 200ms
- [ ] Foreign key constraints prevent orphaned records
- [ ] JSONB fields have documented structure types

## Edge Cases

1. **Duplicate URLs from different sources**

   - Expected behavior: Single item record, multiple source attributions
   - Handling strategy: Use url_hash for deduplication, track all source_ids in metadata

2. **Missing publication dates**

   - Expected behavior: Use discovery date as fallback
   - Handling strategy: published_at nullable, default to discovered_at in queries

3. **Scoring version changes**

   - Expected behavior: Old signals retained, new version signals added
   - Handling strategy: Never delete signals, filter by scoring_version for display

4. **Large JSONB payloads**

   - Expected behavior: System remains performant
   - Handling strategy: Store large content in R2, only summaries in JSONB

5. **Pipeline failure mid-run**

   - Expected behavior: Partial progress saved, resumable
   - Handling strategy: Item-level status tracking, idempotent processing

6. **Connection exhaustion / Neon cold start**
   - Expected behavior: Queries succeed after brief delay
   - Handling strategy: Neon serverless driver handles HTTP-based connections; document cold-start behavior for serverless

## Non-Functional Requirements

**Performance:**

- Single record lookups: < 50ms
- Daily snapshot query: < 100ms
- Full timeline query (2 years): < 500ms
- Signal aggregation: < 200ms

**Security:**

- All tables have RLS policies (prepared for auth)
- No PII stored in this schema
- API keys and secrets never stored in database

**Data Integrity:**

- All foreign keys enforced
- Cascade deletes only where semantically correct
- Soft deletes for audit-sensitive data

**Technical:**

- Drizzle ORM for type-safe queries
- Zod schemas for validation
- Compatible with Neon Postgres serverless
- Schema versioning via Drizzle migrations
- **Drizzle + Neon Serverless:** Use `drizzle-orm/neon-http` with `neon()`; Drizzle supports Neon's serverless driver. See [Neon + Vercel](https://neon.tech/docs/guides/vercel).
