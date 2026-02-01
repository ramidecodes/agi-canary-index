/**
 * Drizzle relations for AGI Canary Watcher schema.
 * @see docs/features/01-database-schema.md
 */

import { relations } from "drizzle-orm";
import {
  canaryDefinitions,
  dailySnapshots,
  documents,
  items,
  pipelineRuns,
  signals,
  sourceFetchLogs,
  sources,
  timelineEvents,
} from "./schema";

export const sourcesRelations = relations(sources, ({ many }) => ({
  items: many(items),
  fetchLogs: many(sourceFetchLogs),
}));

export const pipelineRunsRelations = relations(pipelineRuns, ({ many }) => ({
  items: many(items),
  fetchLogs: many(sourceFetchLogs),
}));

export const sourceFetchLogsRelations = relations(
  sourceFetchLogs,
  ({ one }) => ({
    run: one(pipelineRuns),
    source: one(sources),
  }),
);

export const itemsRelations = relations(items, ({ one }) => ({
  run: one(pipelineRuns),
  source: one(sources),
  document: one(documents),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  item: one(items),
  signals: many(signals),
}));

export const signalsRelations = relations(signals, ({ one }) => ({
  document: one(documents),
}));

export const dailySnapshotsRelations = relations(dailySnapshots, () => ({}));

export const canaryDefinitionsRelations = relations(
  canaryDefinitions,
  () => ({}),
);

export const timelineEventsRelations = relations(timelineEvents, () => ({}));
