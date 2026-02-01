/**
 * AI-powered signal extraction from document content.
 * Uses AI SDK generateObject() with OpenRouter and Zod schema.
 * @see docs/features/05-signal-processing.md
 */

import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { SIGNAL_EXTRACTION_MODEL } from "@/lib/ai-models";
import { signalExtractionSchema, type SignalExtraction } from "./schemas";

export interface ExtractContext {
  sourceName: string;
  tier: string;
  publishedDate: string | null;
}

const MAX_CONTENT_CHARS = 120_000;

/**
 * Build the extraction prompt with document content and metadata.
 */
export function buildExtractionPrompt(
  markdownContent: string,
  ctx: ExtractContext
): string {
  const truncated =
    markdownContent.length > MAX_CONTENT_CHARS
      ? markdownContent.slice(0, MAX_CONTENT_CHARS) +
        "\n\n[Document truncated for context limits.]"
      : markdownContent;

  return `You are an AI capability analyst. Analyze this document and extract signals about AI progress.

Document content:
${truncated}

Source: ${ctx.sourceName} (trust level: ${ctx.tier})
Published: ${ctx.publishedDate ?? "unknown"}

Extract:
1. claim_summary: A 1-2 sentence summary of the main capability-related claim (per claim).
2. classification: One of [benchmark_result, policy_update, research_finding, opinion, announcement, other].
3. axes_impacted: Array of { axis, direction, magnitude, uncertainty }
   - axis: One of [reasoning, learning_efficiency, long_term_memory, planning, tool_use, social_cognition, multimodal_perception, robustness, alignment_safety]
   - direction: "up" (improvement), "down" (regression), or "neutral"
   - magnitude: 0.0-1.0 (how significant is this change)
   - uncertainty: 0.0-1.0 (how certain are we about this assessment)
4. benchmark: If a benchmark is mentioned (ARC-AGI, SWE-bench, GPQA, MMMU, HELM, etc.), { name, value, unit } or null.
5. confidence: 0.0-1.0 overall confidence in this extraction.
6. citations: Array of { text, url? } for key quotes or references.

Return a single object with a "claims" array. If the document contains multiple distinct capability claims, add one object per claim. If no capability-relevant information is found, return { "claims": [] }.`;
}

/**
 * Extract structured capability signals from document content using AI.
 * Returns claims (empty if none or extraction failed after retry).
 */
export async function extractSignals(
  markdownContent: string,
  ctx: ExtractContext,
  apiKey: string
): Promise<SignalExtraction> {
  const openrouter = createOpenRouter({ apiKey });
  const model = openrouter(SIGNAL_EXTRACTION_MODEL);
  const prompt = buildExtractionPrompt(markdownContent, ctx);

  try {
    const result = await generateObject({
      model,
      schema: signalExtractionSchema,
      schemaName: "SignalExtraction",
      schemaDescription:
        "Structured capability claims extracted from a document about AI progress.",
      prompt,
      maxRetries: 1,
    });

    const extraction = result.object;
    if (!extraction || !Array.isArray(extraction.claims)) {
      return { claims: [] };
    }
    return extraction;
  } catch {
    return { claims: [] };
  }
}
