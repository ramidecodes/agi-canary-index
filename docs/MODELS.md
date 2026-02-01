# AI Models

This document describes the AI models used in the AGI Canary Watcher and the rationale for their selection.

## Signal Extraction (Document → Structured Output)

**Model:** See `SIGNAL_EXTRACTION_MODEL` in `src/lib/ai-models.ts`

**Use case:** Extract structured capability signals from acquired documents. Each document is analyzed to produce:

- Claim summary
- Classification (benchmark, policy, research, opinion, announcement)
- Axes impacted with direction, magnitude, and uncertainty
- Benchmark mentions (ARC-AGI, SWE-bench, etc.)
- Citations

**Why Claude Sonnet 4.5:**

1. **Structured output support** — OpenRouter and Claude Platform support JSON Schema validation; reliable for `generateObject()` and structured extraction without parsing errors.

2. **Document analysis** — Strong performance on analytical tasks, classification, and following complex instructions. 1M token context window handles long documents.

3. **OpenRouter availability** — Accessed as `anthropic/claude-sonnet-4.5`; unified API with a single key.

4. **Agentic and coding** — Optimized for real-world agents and analytical workflows; well-suited for capability signal extraction.

**Implementation:** See `src/lib/ai-models.ts`. The model ID is hardcoded; no env var. Change the constant to switch models (e.g. for A/B testing).

## Web Search Discovery

**Model:** `perplexity/sonar` (hardcoded in `src/lib/ai-models.ts` as `WEB_SEARCH_MODEL`)

**Use case:** Discover URLs from the web for pipeline ingestion. Query Perplexity for recent articles, reports, and papers about AI capability progress.

**Why Perplexity Sonar:**

1. **Cost/performance** — $1/M input, $1/M output, $5/K requests. Lightweight and fast for daily discovery.
2. **Citations** — Returns URLs and source domains; essential for our URL extraction flow.
3. **OpenRouter** — Single `OPENROUTER_API_KEY` for Perplexity, Grok, and Claude. No separate Perplexity API key.
4. **127K context** — Sufficient for search queries and result synthesis.

**Implementation:** Web discovery runs in the Vercel pipeline. Uses OpenRouter chat completions with `perplexity/sonar`; responses include citations with URLs.

**References:**

- [Perplexity on OpenRouter](https://openrouter.ai/provider/perplexity)
- [Sonar model](https://openrouter.ai/perplexity/sonar)

## X Search (X/Twitter Discovery)

**Model:** `x-ai/grok-4.1-fast` (hardcoded in `src/lib/ai-models.ts`)

**Use case:** Discover URLs and signals from X (Twitter). Grok has real-time X data access. Used as an optional, feature-flagged discovery source alongside Perplexity (web) and RSS.

**Why Grok 4.1 Fast:**

1. **X data access** — Native access to X/Twitter for real-time social signals on AI progress, benchmark announcements, lab updates.
2. **Large context** — 2M token context; web search support ($5/K queries) for grounded results.
3. **OpenRouter** — Available as `x-ai/grok-4.1-fast`; same `OPENROUTER_API_KEY` as signal extraction.

**Implementation:** Optional discovery source. Build pipeline so X can be disabled without breaking ingestion (regulatory considerations in EU/US). See source_type `x` in Source Registry.

**References:**

- [Grok 4.1 Fast on OpenRouter](https://openrouter.ai/x-ai/grok-4.1-fast)

## References

- [Claude Sonnet 4.5 on OpenRouter](https://openrouter.ai/anthropic/claude-sonnet-4.5)
- [OpenRouter Models](https://openrouter.ai/models)
- [OpenRouter Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs)
- [AI SDK generateObject](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-object)
