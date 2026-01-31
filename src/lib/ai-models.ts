/**
 * AI model configuration for the AGI Canary pipeline.
 *
 * @see https://openrouter.ai/models
 */

/**
 * Signal extraction: document → structured capability signals.
 * Claude Sonnet 4.5: 1M context, structured output support, strong document analysis.
 * See docs/MODELS.md
 */
export const SIGNAL_EXTRACTION_MODEL = "anthropic/claude-sonnet-4.5" as const;

/**
 * Web search discovery: find URLs via Perplexity Sonar (OpenRouter).
 * Lightweight, fast, citations. $1/M tokens + $5/K requests.
 * 127K context. Single OPENROUTER_API_KEY for all discovery + extraction.
 *
 * @see https://openrouter.ai/provider/perplexity
 * @see https://openrouter.ai/perplexity/sonar
 */
export const WEB_SEARCH_MODEL = "perplexity/sonar" as const;

/**
 * X (Twitter) search: discover URLs and signals from X/Twitter.
 * Grok has real-time X data access. Feature-flagged; can be disabled.
 * 2M context, web search support. Use via OpenRouter with same API key.
 *
 * @see https://openrouter.ai/x-ai/grok-4.1-fast
 */
export const X_SEARCH_MODEL = "x-ai/grok-4.1-fast" as const;
