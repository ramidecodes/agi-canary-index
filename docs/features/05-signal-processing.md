# AI Signal Processing Pipeline

## Goal

Build the third stage of the data pipeline that uses AI to extract structured signals from acquired documents. The signal processing pipeline must:

- Analyze document content using Vercel AI SDK
- Extract claims about AI capability changes
- Map claims to cognitive axes with confidence scores
- Produce structured signals for aggregation into daily snapshots

This pipeline transforms raw content into the structured intelligence that powers the AGI Canary Watcher's visualizations.

## User Story

As the AGI Canary Watcher system, I want to extract structured capability signals from document content using AI, so that the dashboard can display accurate, traceable metrics.

## Functional Requirements

1. **Document Processing Queue**

   - Process documents with status "acquired"
   - Batch size: 10 documents per execution (due to AI latency)
   - Priority: Tier-0 source documents first
   - Skip already-processed documents

2. **AI-Powered Extraction**

   - Use Vercel AI SDK with structured output
   - Model: configurable (default: GPT-4o or Claude 3.5)
   - Extract from each document:
     - Claim summary (1-2 sentences)
     - Classification (benchmark, policy, research, opinion, announcement)
     - Axes impacted with direction and magnitude
     - Confidence score
     - Key citations/quotes

3. **Capability Axis Mapping**

   - Map extracted claims to 9 cognitive axes:
     - reasoning, learning_efficiency, long_term_memory
     - planning, tool_use, social_cognition
     - multimodal_perception, robustness, alignment_safety
   - Each mapping includes:
     - Direction: up (improvement), down (regression), neutral
     - Magnitude: 0.0-1.0 (how significant)
     - Uncertainty: 0.0-1.0 (how confident in this assessment)

4. **Benchmark Detection**

   - Recognize mentions of known benchmarks:
     - ARC-AGI, SWE-bench, GPQA, MMMU, HELM, etc.
   - Extract metric values when present
   - Normalize to consistent units where possible

5. **Confidence Scoring**

   - Base confidence from AI extraction (0-1)
   - Multiply by source trust_weight
   - Reduce for: opinion pieces, unverified claims, extrapolations
   - Increase for: primary source, benchmark results, peer review

6. **Citation Extraction**

   - Identify quoted statements
   - Extract URLs referenced in content
   - Link to specific text spans for provenance

7. **Signal Creation**

   - Create signal record for each meaningful claim
   - Link to source document
   - Include scoring_version for reproducibility
   - Multiple signals per document allowed

8. **Quality Filtering**
   - Skip signals below confidence threshold (0.3)
   - Flag but don't create for speculative content
   - Require at least one axis impact to create signal

## Data Requirements

**Uses Tables:**

- `documents` - Read acquired documents
- `signals` - Create extracted signals
- `items` - Update status to "processed"
- `sources` - Read trust_weight for confidence calculation

**External Services:**

- Vercel AI SDK with configured provider (OpenAI/Anthropic)

**Environment Variables:**

- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` - AI provider credentials
- `AI_MODEL` - Model identifier (default: gpt-4o)
- `SCORING_VERSION` - Current scoring logic version

**AI Prompt Structure:**

```
You are an AI capability analyst. Analyze this document and extract signals about AI progress.

Document content:
{markdown_content}

Source: {source_name} (trust level: {tier})
Published: {published_date}

Extract:
1. claim_summary: A 1-2 sentence summary of the main capability-related claim
2. classification: One of [benchmark_result, policy_update, research_finding, opinion, announcement, other]
3. axes_impacted: Array of {axis, direction, magnitude, uncertainty}
   - axis: One of [reasoning, learning_efficiency, long_term_memory, planning, tool_use, social_cognition, multimodal_perception, robustness, alignment_safety]
   - direction: "up" (improvement), "down" (regression), or "neutral"
   - magnitude: 0.0-1.0 (how significant is this change)
   - uncertainty: 0.0-1.0 (how certain are we about this assessment)
4. benchmark: If a benchmark is mentioned, {name, value, unit} or null
5. confidence: 0.0-1.0 overall confidence in this extraction
6. citations: Array of {text, url?} for key quotes or references

If no capability-relevant information found, return null.
```

## User Flow

### Automated Processing

1. Acquisition pipeline completes, documents ready
2. Signal processing worker picks up batch of 10 documents
3. For each document:
   - Fetch clean markdown from R2
   - Construct AI prompt with document + metadata
   - Call AI SDK with structured output schema
   - Parse response, validate structure
   - Calculate adjusted confidence (AI confidence × source trust)
   - Filter out low-confidence or empty extractions
   - Create signal records
   - Update document.processed_at
   - Update item status to "processed"
4. Update pipeline_run statistics
5. Continue with next batch until all processed

### Daily Snapshot Generation

1. After signal processing completes for the day
2. Aggregate all signals from current run
3. Calculate axis scores:
   - Weighted average of signal magnitudes × directions
   - Aggregate uncertainty from contributing signals
   - Calculate delta from previous snapshot
4. Determine canary statuses based on thresholds
5. Create daily_snapshot record
6. Pipeline run complete

## Acceptance Criteria

- [ ] AI extraction works with structured output (no parsing failures)
- [ ] All 9 axes correctly identified and mapped
- [ ] Benchmark names recognized (ARC-AGI, SWE-bench, etc.)
- [ ] Confidence scores correctly combined with trust weights
- [ ] Signals created only for meaningful capability claims
- [ ] Low-confidence signals filtered out
- [ ] Citations extracted with text spans
- [ ] Daily snapshots generated with accurate aggregations
- [ ] Scoring version tracked for all signals
- [ ] Processing time: < 30 seconds per document average
- [ ] Total pipeline (discover → process): < 30 minutes daily

## Edge Cases

1. **AI returns malformed response**

   - Expected behavior: Log error, skip document, retry once
   - Handling strategy: Validate against Zod schema, retry with simpler prompt

2. **Document has no capability-relevant content**

   - Expected behavior: No signals created, document marked processed
   - Handling strategy: AI returns null, handle gracefully

3. **Multiple claims in one document**

   - Expected behavior: Create multiple signals
   - Handling strategy: AI prompt asks for array of claims

4. **Conflicting claims (different sources)**

   - Expected behavior: Both signals stored, aggregation handles weighting
   - Handling strategy: Don't deduplicate at signal level, let aggregation resolve

5. **AI model unavailable**

   - Expected behavior: Retry with backoff, skip batch if persistent
   - Handling strategy: Fallback model if primary fails, alert admin

6. **Very long document exceeds context**

   - Expected behavior: Truncate intelligently, process what fits
   - Handling strategy: Take introduction + conclusion sections

7. **Non-English content slipped through**

   - Expected behavior: AI handles, may have lower confidence
   - Handling strategy: AI detects language, reduces confidence for non-English

8. **Scoring version changes mid-run**
   - Expected behavior: All signals in run use consistent version
   - Handling strategy: Lock version at run start, store in pipeline_run

## Non-Functional Requirements

**Performance:**

- AI call latency: < 20 seconds per document
- Batch of 10: < 5 minutes
- Full daily pipeline: < 30 minutes
- Snapshot generation: < 30 seconds

**Cost Management:**

- Track token usage per run
- Alert if daily cost exceeds threshold
- Use smaller model for triage, larger for full extraction (optional)

**Reliability:**

- AI failures don't crash pipeline
- Partial processing saved
- Resume from last processed document

**Accuracy:**

- Regular manual review of extraction quality
- A/B testing when changing prompts
- Track precision/recall metrics

**Observability:**

- Log AI responses for debugging
- Track extraction confidence distribution
- Alert on unusual patterns (all low confidence, all same axis)

**Security:**

- Don't send sensitive content to AI (none expected in this domain)
- API keys in environment only
- Log sanitization

**Technical:**

- Vercel AI SDK with structured output
- Zod schemas for response validation
- Drizzle for database operations
- Idempotent: re-running skips already-processed documents
