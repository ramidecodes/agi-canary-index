/**
 * AI model configuration for the AGI Canary pipeline.
 *
 * @see https://openrouter.ai/models
 */

/**
 * Signal extraction: document → structured capability signals.
 * Grok 4.1 Fast: cheaper, strong structured output. See docs/MODELS.md
 */
export const SIGNAL_EXTRACTION_MODEL = "x-ai/grok-4.1-fast" as const;

/**
 * Web search discovery: find URLs via Perplexity Sonar (OpenRouter).
 * Lightweight, fast, citations. $1/M tokens + $5/K requests.
 * 127K context. Single OPENROUTER_API_KEY for all discovery + extraction.
 *
 * @see https://openrouter.ai/provider/perplexity
 * @see https://openrouter.ai/perplexity/sonar
 */
export const WEB_SEARCH_MODEL = "perplexity/sonar" as const;
