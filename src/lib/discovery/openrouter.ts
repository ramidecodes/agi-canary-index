/**
 * OpenRouter AI SDK helpers.
 * @see docs/features/03-discovery-pipeline.md
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export function getOpenRouterModel(apiKey: string, model: string) {
  const openrouter = createOpenRouter({ apiKey });
  return openrouter(model);
}
