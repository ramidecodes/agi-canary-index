/**
 * AGI Canary Watcher - Database schema
 * Drizzle ORM definitions for Neon Postgres.
 * @see docs/features/01-database-schema.md
 */

import {
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  pgPolicy,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export const sourceTierEnum = pgEnum("source_tier", [
  "TIER_0",
  "TIER_1",
  "DISCOVERY",
]);
export const cadenceEnum = pgEnum("cadence", ["daily", "weekly", "monthly"]);
export const domainTypeEnum = pgEnum("domain_type", [
  "evaluation",
  "policy",
  "research",
  "commentary",
]);
export const sourceTypeEnum = pgEnum("source_type", [
  "rss",
  "search",
  "curated",
  "api",
  "x",
]);
export const pipelineRunStatusEnum = pgEnum("pipeline_run_status", [
  "running",
  "completed",
  "failed",
]);
export const itemStatusEnum = pgEnum("item_status", [
  "pending",
  "acquired",
  "processed",
  "failed",
]);
export const timelineEventTypeEnum = pgEnum("timeline_event_type", [
  "reality",
  "fiction",
  "speculative",
]);

// -----------------------------------------------------------------------------
// Tables
// -----------------------------------------------------------------------------

/** Trusted data sources for the pipeline. */
export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 512 }).notNull(),
    url: varchar("url", { length: 2048 }).notNull(),
    tier: sourceTierEnum("tier").notNull(),
    trustWeight: decimal("trust_weight", { precision: 4, scale: 2 })
      .notNull()
      .default("1"),
    cadence: cadenceEnum("cadence").notNull(),
    domainType: domainTypeEnum("domain_type").notNull(),
    sourceType: sourceTypeEnum("source_type").notNull(),
    queryConfig: jsonb("query_config").$type<Record<string, unknown>>(),
    isActive: boolean("is_active").notNull().default(true),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    errorCount: integer("error_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (_t) => [
    pgPolicy("sources_public_all", {
      as: "permissive",
      for: "all",
      to: "public",
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

/** Each execution of the data pipeline. */
export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: pipelineRunStatusEnum("status").notNull().default("running"),
    itemsDiscovered: integer("items_discovered").notNull().default(0),
    itemsProcessed: integer("items_processed").notNull().default(0),
    itemsFailed: integer("items_failed").notNull().default(0),
    errorLog: text("error_log"),
    scoringVersion: varchar("scoring_version", { length: 64 }),
  },
  (_t) => [
    pgPolicy("pipeline_runs_public_all", {
      as: "permissive",
      for: "all",
      to: "public",
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

/** Discovered URLs awaiting or completed processing. */
export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => pipelineRuns.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    url: varchar("url", { length: 2048 }).notNull(),
    urlHash: varchar("url_hash", { length: 64 }).notNull(),
    title: varchar("title", { length: 1024 }),
    discoveredAt: timestamp("discovered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: itemStatusEnum("status").notNull().default("pending"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("items_url_unique").on(t.url),
    index("items_url_hash_idx").on(t.urlHash),
    index("items_status_idx").on(t.status),
    index("items_run_id_idx").on(t.runId),
    index("items_source_id_idx").on(t.sourceId),
    pgPolicy("items_public_all", {
      as: "permissive",
      for: "all",
      to: "public",
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

/** Acquired and processed content (links to R2 blobs). */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    rawBlobKey: varchar("raw_blob_key", { length: 512 }),
    cleanBlobKey: varchar("clean_blob_key", { length: 512 }),
    extractedMetadata:
      jsonb("extracted_metadata").$type<Record<string, unknown>>(),
    wordCount: integer("word_count"),
    acquiredAt: timestamp("acquired_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    index("documents_item_id_idx").on(t.itemId),
    pgPolicy("documents_public_all", {
      as: "permissive",
      for: "all",
      to: "public",
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

/** Structured claims extracted from documents. */
export const signals = pgTable(
  "signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    claimSummary: text("claim_summary").notNull(),
    axesImpacted:
      jsonb("axes_impacted").$type<
        Array<{
          axis: string;
          direction: string;
          magnitude: number;
          uncertainty?: number;
        }>
      >(),
    metric: jsonb("metric").$type<{
      name: string;
      value: number;
      unit?: string;
    }>(),
    confidence: decimal("confidence", { precision: 4, scale: 2 }).notNull(),
    citations:
      jsonb("citations").$type<Array<{ url: string; quoted_span?: string }>>(),
    scoringVersion: varchar("scoring_version", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("signals_document_id_idx").on(t.documentId),
    pgPolicy("signals_public_all", {
      as: "permissive",
      for: "all",
      to: "public",
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

/** Aggregated daily state for display. */
export const dailySnapshots = pgTable(
  "daily_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date", { mode: "string" }).notNull(),
    axisScores:
      jsonb("axis_scores").$type<
        Record<string, { score: number; uncertainty?: number; delta?: number }>
      >(),
    canaryStatuses: jsonb("canary_statuses").$type<
      Array<{
        canary_id: string;
        status: string;
        last_change?: string;
        confidence?: number;
      }>
    >(),
    coverageScore: decimal("coverage_score", { precision: 4, scale: 2 }),
    signalIds: uuid("signal_ids").array(),
    notes: jsonb("notes").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("daily_snapshots_date_unique").on(t.date),
    index("daily_snapshots_date_idx").on(t.date),
    pgPolicy("daily_snapshots_public_all", {
      as: "permissive",
      for: "all",
      to: "public",
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

/** Configuration for canary indicators. */
export const canaryDefinitions = pgTable(
  "canary_definitions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description").notNull(),
    axesWatched: jsonb("axes_watched").$type<string[]>(),
    thresholds: jsonb("thresholds").$type<{
      green?: unknown;
      yellow?: unknown;
      red?: unknown;
    }>(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (_t) => [
    pgPolicy("canary_definitions_public_all", {
      as: "permissive",
      for: "all",
      to: "public",
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

/** Events for the timeline visualization. */
export const timelineEvents = pgTable(
  "timeline_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date", { mode: "string" }).notNull(),
    title: varchar("title", { length: 512 }).notNull(),
    description: text("description").notNull(),
    eventType: timelineEventTypeEnum("event_type").notNull(),
    category: varchar("category", { length: 128 }).notNull(),
    sourceUrl: varchar("source_url", { length: 2048 }),
    axesImpacted: jsonb("axes_impacted").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("timeline_events_date_idx").on(t.date),
    pgPolicy("timeline_events_public_all", {
      as: "permissive",
      for: "all",
      to: "public",
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);
