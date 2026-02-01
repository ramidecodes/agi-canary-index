/**
 * Zod schemas for database entities.
 * Used for runtime validation and API boundaries.
 * @see docs/features/01-database-schema.md
 */

import { z } from "zod";

// -----------------------------------------------------------------------------
// Enums (mirror schema enums)
// -----------------------------------------------------------------------------

export const sourceTierSchema = z.enum(["TIER_0", "TIER_1", "DISCOVERY"]);
export const cadenceSchema = z.enum(["daily", "weekly", "monthly"]);
export const domainTypeSchema = z.enum([
  "evaluation",
  "policy",
  "research",
  "commentary",
]);
export const sourceTypeSchema = z.enum([
  "rss",
  "search",
  "curated",
  "api",
  "x",
]);
export const pipelineRunStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
]);
export const itemStatusSchema = z.enum([
  "pending",
  "acquired",
  "processed",
  "failed",
]);
export const timelineEventTypeSchema = z.enum([
  "reality",
  "fiction",
  "speculative",
]);

// -----------------------------------------------------------------------------
// JSONB shapes (documented per FRED)
// -----------------------------------------------------------------------------

export const axisImpactSchema = z.object({
  axis: z.string(),
  direction: z.string(),
  magnitude: z.number(),
  uncertainty: z.number().optional(),
});

export const signalMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  unit: z.string().optional(),
});

export const citationSchema = z.object({
  url: z.string(),
  quoted_span: z.string().optional(),
});

export const canaryStatusSchema = z.object({
  canary_id: z.string(),
  status: z.string(),
  last_change: z.string().optional(),
  confidence: z.number().optional(),
});

export const axisScoreSchema = z.object({
  score: z.number(),
  uncertainty: z.number().optional(),
  delta: z.number().optional(),
});

export const canaryThresholdsSchema = z.object({
  green: z.unknown().optional(),
  yellow: z.unknown().optional(),
  red: z.unknown().optional(),
});

// -----------------------------------------------------------------------------
// Table insert/select schemas
// -----------------------------------------------------------------------------

export const insertSourceSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().max(512),
  url: z.string().max(2048),
  tier: sourceTierSchema,
  trustWeight: z.string().default("1"),
  cadence: cadenceSchema,
  domainType: domainTypeSchema,
  sourceType: sourceTypeSchema,
  queryConfig: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().default(true),
  lastSuccessAt: z.coerce.date().optional(),
  errorCount: z.number().int().default(0),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

/** Partial update for PATCH (admin source registry). */
export const updateSourceSchema = insertSourceSchema.partial().extend({
  id: z.uuid().optional(),
});

/** Bulk action body for admin source registry. */
export const bulkSourcesActionSchema = z.object({
  sourceIds: z.array(z.uuid()).min(1),
  action: z.enum(["enable", "disable", "change_tier"]),
  tier: sourceTierSchema.optional(),
});

export const insertPipelineRunSchema = z.object({
  id: z.uuid().optional(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  status: pipelineRunStatusSchema.default("running"),
  itemsDiscovered: z.number().int().default(0),
  itemsProcessed: z.number().int().default(0),
  itemsFailed: z.number().int().default(0),
  errorLog: z.string().optional(),
  scoringVersion: z.string().max(64).optional(),
});

export const insertItemSchema = z.object({
  id: z.uuid().optional(),
  runId: z.uuid(),
  sourceId: z.uuid(),
  url: z.string().max(2048),
  urlHash: z.string().max(64),
  title: z.string().max(1024).optional(),
  discoveredAt: z.coerce.date().optional(),
  status: itemStatusSchema.default("pending"),
  publishedAt: z.coerce.date().optional(),
});

export const insertDocumentSchema = z.object({
  id: z.uuid().optional(),
  itemId: z.uuid(),
  rawBlobKey: z.string().max(512).optional(),
  cleanBlobKey: z.string().max(512).optional(),
  extractedMetadata: z.record(z.string(), z.unknown()).optional(),
  wordCount: z.number().int().optional(),
  acquiredAt: z.coerce.date().optional(),
  processedAt: z.coerce.date().optional(),
});

export const insertSignalSchema = z.object({
  id: z.uuid().optional(),
  documentId: z.uuid(),
  claimSummary: z.string(),
  axesImpacted: z.array(axisImpactSchema).optional(),
  metric: signalMetricSchema.optional(),
  confidence: z.string(),
  citations: z.array(citationSchema).optional(),
  scoringVersion: z.string().max(64),
  createdAt: z.coerce.date().optional(),
});

export const insertDailySnapshotSchema = z.object({
  id: z.uuid().optional(),
  date: z.string(),
  axisScores: z.record(z.string(), axisScoreSchema).optional(),
  canaryStatuses: z.array(canaryStatusSchema).optional(),
  coverageScore: z.string().optional(),
  signalIds: z.array(z.uuid()).optional(),
  notes: z.array(z.string()).optional(),
  createdAt: z.coerce.date().optional(),
});

export const insertCanaryDefinitionSchema = z.object({
  id: z.string().max(64),
  name: z.string().max(256),
  description: z.string(),
  axesWatched: z.array(z.string()).optional(),
  thresholds: canaryThresholdsSchema.optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const insertTimelineEventSchema = z.object({
  id: z.uuid().optional(),
  date: z.string(),
  title: z.string().max(512),
  description: z.string(),
  eventType: timelineEventTypeSchema,
  category: z.string().max(128),
  sourceUrl: z.string().max(2048).optional(),
  axesImpacted: z.array(z.string()).optional(),
  createdAt: z.coerce.date().optional(),
});

// -----------------------------------------------------------------------------
// Exported types (infer from Zod)
// -----------------------------------------------------------------------------

export type SourceTier = z.infer<typeof sourceTierSchema>;
export type Cadence = z.infer<typeof cadenceSchema>;
export type DomainType = z.infer<typeof domainTypeSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type PipelineRunStatus = z.infer<typeof pipelineRunStatusSchema>;
export type ItemStatus = z.infer<typeof itemStatusSchema>;
export type TimelineEventType = z.infer<typeof timelineEventTypeSchema>;

export type InsertSource = z.infer<typeof insertSourceSchema>;
export type UpdateSource = z.infer<typeof updateSourceSchema>;
export type BulkSourcesAction = z.infer<typeof bulkSourcesActionSchema>;
export type InsertPipelineRun = z.infer<typeof insertPipelineRunSchema>;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type InsertDailySnapshot = z.infer<typeof insertDailySnapshotSchema>;
export type InsertCanaryDefinition = z.infer<
  typeof insertCanaryDefinitionSchema
>;
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;
