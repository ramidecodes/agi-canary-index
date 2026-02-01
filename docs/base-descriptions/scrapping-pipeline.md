Here’s a clean, production-friendly stack + pipeline that fits your constraints (Next.js on Vercel + AI SDK, Neon Postgres, R2, daily scraping, news section) and avoids the usual scraping pain.

I’ll give you: 1. Recommended architecture 2. Scraping → processing → storage pipeline 3. Where Perplexity vs Firecrawl vs Grok fit 4. Concrete TypeScript skeletons (Vercel cron) 5. DB + storage model (minimal but extensible)

⸻

0. Your baseline stack (locked in)

Web app + API
• Next.js on Vercel

https://nextjs.org/
https://vercel.com/

AI inference + extraction + classification
• Vercel AI SDK

https://ai-sdk.dev/
https://vercel.com/docs/ai-sdk

AI SDK supports multiple providers via adapters. ￼

DB
• Neon Postgres

https://neon.tech/

Object storage
• Cloudflare R2 (S3-compatible, zero egress fees positioning)

https://www.cloudflare.com/developer-platform/products/r2/

￼

⸻

1. Recommended architecture (simple + robust)

The winning pattern: 2-phase pipeline

Discovery (find URLs) → Acquisition (fetch content) → Extraction/Scoring (AI) → Persist + publish

Why: discovery sources change daily; extraction needs retries + dedupe; the news section needs traceability.

Where to run the pipeline

You have two viable schedulers:

Option A — Cloudflare Worker Cron (my pick for “daily scraping pipeline”)
• Cron triggers call your Worker’s scheduled() handler. ￼
• Great for calling third-party APIs on schedule, cheap, fast cold starts.

Option B — Vercel Cron
• Vercel supports cron jobs for Serverless/Edge functions configured in vercel.json. ￼
• Great if you want everything “inside Vercel”.

Hybrid (best of both):
• Use Cloudflare Worker Cron as the “orchestrator”
• Keep Next/Vercel focused on the app + UI + authenticated admin endpoints
• Worker writes directly to Neon + R2, or calls a protected Vercel endpoint to enqueue work

⸻

2. Scraping toolchain: what each provider is best at

Discovery (find candidate links)

Perplexity Search API is strong here: ranked search results + filtering + content extraction. ￼

https://www.perplexity.ai/api-platform
https://docs.perplexity.ai/

Use it to produce: [{url, title, snippet, source, published_at?}]

Acquisition (turn URLs into clean text/markdown)

Firecrawl is great for “web pages → clean markdown / structured JSON”, and supports extraction endpoints. ￼

https://docs.firecrawl.dev/
https://www.firecrawl.dev/

Rate limits / plans exist—design for quotas & retries. ￼

X/Twitter-native signals

xAI API exists and is OpenAI/Anthropic-SDK-compatible per their docs. ￼

https://x.ai/api
https://docs.x.ai/

Important practical note: anything “Grok daily news on X” is currently under heavy regulatory scrutiny in the EU/US news cycle; build your pipeline so X is an optional source you can disable without breaking ingestion. ￼

My suggestion (best combo)
• Perplexity = discovery (fast + broad)
• Firecrawl = acquisition & extraction (stable)
• AI SDK model = classification + mapping to your AGI metrics
• (Optional) xAI = “X pulse” stream (feature-flagged)

⸻

3. The pipeline you should implement (modules)

3.1 Source Registry

A table/config that defines:
• Source type: rss | search | curated | x
• Query: keywords + domains allow/deny
• Cadence: daily/weekly
• Trust weight: (OECD > random blog)

3.2 Discovery Job

Produces a batch of “candidate URLs” for that day:
• From Perplexity Search queries (AI evals, “ARC-AGI”, “METR evaluation”, “OECD capability indicators”, “frontier model evaluation”, etc.)
• From RSS feeds (labs, arXiv categories, HAI, AISI, Epoch)
• From curated list (your “must-watch” pages)

3.3 Dedupe + canonicalization

Before fetching anything:
• Normalize URL (strip utm, fragments)
• Hash canonical url
• Check if already seen this week (avoid loops)

3.4 Acquisition Job

Fetch the page to:
• raw_html (optional)
• clean_markdown
• extracted_metadata (author, date, outlet)

Store large blobs in R2; keep only pointers in Postgres.

3.5 AI Processing Job (AI SDK)

Given clean markdown:
• classify as:
• benchmark result / policy doc / research / opinion / social signal
• extract structured fields:
• claim_summary
• capability_axes_impacted[]
• delta_estimates + uncertainty
• citations (urls + quoted spans)

3.6 Scoring + Snapshot

Aggregate day’s signals into:
• daily_snapshot (axis scores + uncertainty + coverage)
• canary_statuses (ARC, autonomy, tool-use, etc.)

3.7 Publish

Your Next.js app reads:
• daily_snapshot
• processed_items for news list
• “evidence trail” (clickthrough)

⸻

4. Scheduling + execution: Cloudflare Worker Cron (recommended)

Cloudflare Cron Triggers run a Worker on a schedule via scheduled() handler. ￼

https://developers.cloudflare.com/workers/configuration/cron-triggers/

Worker responsibilities
• Run discover() to produce candidate URLs
• Enqueue acquire(url) tasks (batch)
• Enqueue process(doc) tasks (batch)
• Write results to Neon + R2

Avoid doing everything in one invocation:
• Cron kicks off a “run”
• Work is chunked into small tasks (keeps it resilient)

If you want pure Cloudflare: add a queue (Workers Queues) — but even without it, you can implement “chunked batching” by storing a run cursor in Postgres and re-invoking via HTTP.

⸻

5. Alternative: Vercel Cron

Vercel Cron can trigger a route on schedule configured in vercel.json. ￼

https://vercel.com/docs/cron-jobs

This is great if:
• you want fewer moving parts
• your daily workload stays within serverless limits

Cloudflare Worker is better if:
• you expect higher volume crawling
• you want cheaper scheduled compute
• you want to keep scraping separate from the web app

⸻

6. Minimal data model (Neon Postgres)

Tables you’ll want from day 1
• sources
• runs (daily pipeline run)
• items (one per URL)
• documents (pointers to R2 blobs + extracted metadata)
• signals (structured extracted claims)
• daily_snapshots (home page summary)

Why this matters

It gives you:
• audit trail (credibility)
• dedupe
• reprocessing (if your scoring logic changes)

⸻

7. TypeScript skeletons

7.1 Cloudflare Worker scheduled handler (orchestrator)

export default {
async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
const runId = await startRun(env); // insert runs row
const candidates = await discoverCandidates(env); // perplexity + rss + curated

    // chunk to avoid timeouts
    for (const batch of chunk(candidates, 50)) {
      ctx.waitUntil(acquireBatch(env, runId, batch)); // firecrawl scrape
    }

}
};

// acquireBatch() would:
// 1) dedupe insert items
// 2) call Firecrawl scrape/extract
// 3) store blobs to R2
// 4) insert documents rows
// 5) enqueue/process immediately or via another endpoint

7.2 Vercel cron route (if you keep scheduling in Vercel)

// app/api/cron/daily/route.ts
import { NextResponse } from "next/server";

export async function GET() {
// verify secret header (Vercel cron can send)
// kick off pipeline run (maybe call a Cloudflare Worker endpoint)
return NextResponse.json({ ok: true });
}

7.3 AI SDK extraction pattern (structured output)

Use AI SDK to produce a strict JSON payload describing:
• axes impacted
• magnitude
• uncertainty
• citation spans

(Implementation depends on your chosen provider adapter, but the pattern stays identical.)

⸻

8. News section (UX + data)

Your “news” page becomes trivial if each item stores:
• title
• url
• source/outlet
• published_at (best effort)
• tags (benchmarks, autonomy, policy, fiction)
• why_it_matters (1–2 lines from extraction)
• confidence

Then Home can show:
• “Today’s movement”
• “Top 5 evidence links”
• “Coverage changes”

⸻

9. My concrete recommendation for v1

Run-time components 1. Cloudflare Worker Cron orchestrator (daily) ￼ 2. Perplexity Search API for discovery ￼ 3. Firecrawl for acquisition/extraction of web pages ￼ 4. AI SDK for classification + mapping to your metrics ￼ 5. Neon Postgres as system of record 6. Cloudflare R2 for raw/clean doc blobs ￼ 7. Optional: xAI as feature-flagged “X pulse” source ￼

⸻

10. Two implementation choices you should make now (I’ll assume defaults)
    1.  ORM: Drizzle (nice TS + Postgres-first)

https://orm.drizzle.team/

    2.	Schema versioning for scoring

Keep a scoring_version column on signals + daily_snapshots.
So you can re-run mapping logic without corrupting historical views.

⸻
