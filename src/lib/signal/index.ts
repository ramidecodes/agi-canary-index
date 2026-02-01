/**
 * Signal processing pipeline: AI extraction from documents, signal creation.
 * @see docs/features/05-signal-processing.md
 */

export { extractSignals, buildExtractionPrompt } from "./extract";
export type { ExtractContext } from "./extract";
export {
  runSignalProcessing,
  type SignalProcessingContext,
  type SignalProcessingOptions,
  type SignalProcessingStats,
  type ProcessedDocumentResult,
} from "./run";
export {
  signalExtractionSchema,
  AXES,
  axisSchema,
  directionSchema,
  axisImpactSchema,
  classificationSchema,
  benchmarkSchema,
  citationSchema,
  extractedClaimSchema,
} from "./schemas";
export type { SignalExtraction, ExtractedClaim, AxisImpact } from "./schemas";
export { createDailySnapshot } from "./snapshot";
