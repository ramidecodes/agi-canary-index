/**
 * Zod schemas for AI signal extraction output.
 * Used with generateText() + Output.object() (AI SDK v6) for structured capability claims.
 * @see docs/features/05-signal-processing.md
 */

import { z } from "zod";

/** Cognitive axes (9) for capability mapping. */
export const AXES = [
  "reasoning",
  "learning_efficiency",
  "long_term_memory",
  "planning",
  "tool_use",
  "social_cognition",
  "multimodal_perception",
  "robustness",
  "alignment_safety",
] as const;

export const axisSchema = z.enum(AXES);

/** Direction of change. */
export const directionSchema = z.enum(["up", "down", "neutral"]);

/** Single axis impact. */
export const axisImpactSchema = z.object({
  axis: axisSchema.describe(
    "One of: reasoning, learning_efficiency, long_term_memory, planning, tool_use, social_cognition, multimodal_perception, robustness, alignment_safety",
  ),
  direction: directionSchema.describe(
    "up = improvement, down = regression, neutral = no change",
  ),
  magnitude: z.number().describe("How significant is this change, 0.0-1.0"),
  uncertainty: z
    .number()
    .optional()
    .default(0.5)
    .describe("How confident in this assessment, 0.0-1.0"),
});

/** Classification of the claim. */
export const classificationSchema = z.enum([
  "benchmark_result",
  "policy_update",
  "research_finding",
  "opinion",
  "announcement",
  "other",
]);

/** Benchmark mention (ARC-AGI, SWE-bench, etc.). */
export const benchmarkSchema = z
  .object({
    name: z.string().describe("Benchmark name (e.g. ARC-AGI, SWE-bench)"),
    value: z.number().describe("Metric value when present"),
    unit: z.string().optional().describe("Unit if applicable"),
  })
  .nullable();

/** Citation: quoted text and optional URL. */
export const citationSchema = z.object({
  text: z.string().describe("Quoted statement or reference text"),
  url: z
    .union([z.url(), z.literal("")])
    .optional()
    .describe("URL if present; omit or use empty string when none"),
});

/** Single extracted claim (one document can yield multiple). */
export const extractedClaimSchema = z.object({
  claim_summary: z
    .string()
    .describe("1-2 sentence summary of the capability-related claim"),
  classification: classificationSchema.describe(
    "Type: benchmark_result, policy_update, research_finding, opinion, announcement, other",
  ),
  axes_impacted: z
    .array(axisImpactSchema)
    .min(1)
    .describe("At least one axis with direction, magnitude, uncertainty"),
  benchmark: benchmarkSchema
    .optional()
    .describe(
      "If a known benchmark is mentioned (ARC-AGI, SWE-bench, GPQA, MMMU, HELM, etc.), else null",
    ),
  confidence: z
    .number()
    .describe("Overall confidence in this extraction, 0.0-1.0"),
  citations: z
    .array(citationSchema)
    .default([])
    .describe("Key quotes or references"),
});

/** Full extraction: array of claims. Empty array = no capability-relevant info. */
export const signalExtractionSchema = z.object({
  claims: z
    .array(extractedClaimSchema)
    .describe(
      "Array of capability claims. Empty if no capability-relevant information found.",
    ),
});

export type SignalExtraction = z.infer<typeof signalExtractionSchema>;
export type ExtractedClaim = z.infer<typeof extractedClaimSchema>;
export type AxisImpact = z.infer<typeof axisImpactSchema>;
