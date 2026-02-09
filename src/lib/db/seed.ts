/**
 * Seed script for AGI Canary Watcher database.
 * Run: pnpm run db:seed
 * Requires DATABASE_URL in .env and migrations applied.
 * @see docs/features/02-source-registry.md for source list.
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { createDb } from "./index";
import { canaryDefinitions, sources, timelineEvents } from "./schema";
import { SEED_SOURCES } from "../sources";

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const db = createDb(url);

  console.log("Seeding canary_definitions...");
  const canaries: Array<{
    id: string;
    name: string;
    description: string;
    axesWatched: string[];
    thresholds: { green: string; yellow: string; red: string };
    displayOrder: number;
    isActive: boolean;
  }> = [
    {
      id: "arc_agi",
      name: "ARC-AGI",
      description:
        "AI2 Reasoning Challenge (AGI) — tasks requiring genuine understanding and generalization.",
      axesWatched: ["reasoning", "learning_efficiency"],
      thresholds: {
        green: ">50%",
        yellow: "10–50%",
        red: "<10%",
      },
      displayOrder: 0,
      isActive: true,
    },
    {
      id: "long_horizon",
      name: "Long-horizon planning",
      description: "Multi-step planning and tool use over extended horizons.",
      axesWatched: ["planning", "tool_use"],
      thresholds: {
        green: "robust",
        yellow: "partial",
        red: "minimal",
      },
      displayOrder: 1,
      isActive: true,
    },
    {
      id: "safety_canary",
      name: "Alignment & safety",
      description:
        "Indicators of alignment research progress and safety-relevant capabilities.",
      axesWatched: ["alignment_safety", "robustness"],
      thresholds: {
        green: "improving",
        yellow: "stable",
        red: "concerning",
      },
      displayOrder: 2,
      isActive: true,
    },
    // Risk canaries for Autonomy & Risk page (08-autonomy-risk.md)
    // long_horizon already defined above; risk page also includes it via axes_watched
    {
      id: "self_improvement",
      name: "Recursive self-improvement",
      description:
        "Signals suggesting improved ability to modify own code or improve capabilities autonomously.",
      axesWatched: ["learning_efficiency", "tool_use"],
      thresholds: {
        green: "none observed",
        yellow: "early signals",
        red: "concerning",
      },
      displayOrder: 11,
      isActive: true,
    },
    {
      id: "economic_impact",
      name: "Economic displacement",
      description:
        "Indicators of AI capability to displace human labor in knowledge work.",
      axesWatched: ["reasoning", "tool_use"],
      thresholds: { green: "contained", yellow: "partial", red: "significant" },
      displayOrder: 12,
      isActive: true,
    },
    {
      id: "alignment_coverage",
      name: "Alignment eval coverage",
      description:
        "How well current autonomy levels are being evaluated for safety and alignment.",
      axesWatched: ["alignment_safety"],
      thresholds: {
        green: "well-tested",
        yellow: "partial coverage",
        red: "gaps",
      },
      displayOrder: 13,
      isActive: true,
    },
    {
      id: "deception",
      name: "Deception detection",
      description:
        "Capability to detect deception and manipulation in model outputs.",
      axesWatched: ["social_cognition", "alignment_safety"],
      thresholds: { green: "robust", yellow: "partial", red: "weak" },
      displayOrder: 14,
      isActive: true,
    },
    {
      id: "tool_creation",
      name: "Tool creation capability",
      description:
        "Ability to create new tools, code, and extensions autonomously.",
      axesWatched: ["tool_use", "reasoning"],
      thresholds: {
        green: "controlled",
        yellow: "emerging",
        red: "autonomous",
      },
      displayOrder: 15,
      isActive: true,
    },
  ];

  for (const c of canaries) {
    await db
      .insert(canaryDefinitions)
      .values(c)
      .onConflictDoUpdate({
        target: canaryDefinitions.id,
        set: {
          name: c.name,
          description: c.description,
          axesWatched: c.axesWatched,
          thresholds: c.thresholds,
          displayOrder: c.displayOrder,
          isActive: c.isActive,
        },
      });
  }
  console.log(`  Inserted/updated ${canaries.length} canary definitions.`);

  console.log("Seeding source registry (Tier-0 and Tier-1)...");
  let inserted = 0;
  let updated = 0;
  for (const s of SEED_SOURCES) {
    const existing = await db
      .select({ id: sources.id })
      .from(sources)
      .where(eq(sources.name, s.name))
      .limit(1);
    if (existing.length > 0) {
      await db
        .update(sources)
        .set({
          url: s.url,
          tier: s.tier,
          trustWeight: s.trustWeight,
          cadence: s.cadence,
          domainType: s.domainType,
          sourceType: s.sourceType,
          queryConfig: s.queryConfig ?? null,
          updatedAt: new Date(),
        })
        .where(eq(sources.id, existing[0].id));
      updated++;
    } else {
      await db.insert(sources).values({
        name: s.name,
        url: s.url,
        tier: s.tier,
        trustWeight: s.trustWeight,
        cadence: s.cadence,
        domainType: s.domainType,
        sourceType: s.sourceType,
        queryConfig: s.queryConfig ?? null,
        isActive: true,
      });
      inserted++;
    }
  }
  console.log(
    `  Inserted ${inserted}, updated ${updated} sources; ${SEED_SOURCES.length} total in seed.`,
  );

  console.log("Seeding timeline events (curated AI milestones)...");
  // Curated milestones: foundational research, breakthrough benchmarks, flagship models, major policy.
  // Excluded: incremental releases, speculation, minor eval frameworks (METR, HELM).
  const timelineSeedData = [
    // Research foundations
    {
      date: "1956-08-01",
      title: "Dartmouth Conference",
      description:
        "Birth of AI. John McCarthy, Marvin Minsky, and others coined the term 'artificial intelligence' and outlined goals for machine learning and reasoning.",
      eventType: "reality" as const,
      category: "research" as const,
      sourceUrl: "https://en.wikipedia.org/wiki/Dartmouth_workshop",
      axesImpacted: ["reasoning"],
    },
    {
      date: "1958-01-01",
      title: "Perceptron (Frank Rosenblatt)",
      description:
        "First artificial neural network capable of learning. The perceptron could learn linearly separable patterns.",
      eventType: "reality" as const,
      category: "research" as const,
      axesImpacted: ["learning_efficiency"],
    },
    {
      date: "1966-01-01",
      title: "ELIZA",
      description:
        "Joseph Weizenbaum's natural language program. Early chatbot demonstrating pattern-matching dialogue.",
      eventType: "reality" as const,
      category: "research" as const,
      axesImpacted: ["social_cognition"],
    },
    {
      date: "1973-01-01",
      title: "Lighthill Report",
      description:
        "UK government report criticizing AI research progress. Led to reduced funding and the AI winter.",
      eventType: "reality" as const,
      category: "policy" as const,
    },
    {
      date: "1986-01-01",
      title: "Backpropagation popularized",
      description:
        "Rumelhart, Hinton, Williams popularized backpropagation for training multi-layer networks, reviving neural network research.",
      eventType: "reality" as const,
      category: "research" as const,
      sourceUrl: "https://en.wikipedia.org/wiki/Backpropagation",
      axesImpacted: ["learning_efficiency"],
    },
    // Breakthrough benchmarks
    {
      date: "1997-05-11",
      title: "Deep Blue beats Kasparov",
      description:
        "IBM's Deep Blue defeated world chess champion Garry Kasparov. Landmark in game-playing AI.",
      eventType: "reality" as const,
      category: "benchmark" as const,
      sourceUrl:
        "https://en.wikipedia.org/wiki/Deep_Blue_versus_Garry_Kasparov",
      axesImpacted: ["reasoning"],
    },
    {
      date: "2011-02-16",
      title: "Watson wins Jeopardy!",
      description:
        "IBM Watson defeated human champions on Jeopardy!. Demonstrated NLP and retrieval at scale.",
      eventType: "reality" as const,
      category: "benchmark" as const,
      sourceUrl: "https://en.wikipedia.org/wiki/Watson_(computer)",
      axesImpacted: ["reasoning", "social_cognition"],
    },
    {
      date: "2012-09-30",
      title: "AlexNet (ImageNet breakthrough)",
      description:
        "Alex Krizhevsky's CNN achieved dramatic error reduction on ImageNet, triggering the deep learning revolution.",
      eventType: "reality" as const,
      category: "benchmark" as const,
      sourceUrl: "https://en.wikipedia.org/wiki/AlexNet",
      axesImpacted: ["learning_efficiency"],
    },
    {
      date: "2014-01-01",
      title: "Sequence-to-sequence learning",
      description:
        "Sutskever et al. introduced seq2seq with LSTM for machine translation. Foundation for many NLP advances.",
      eventType: "reality" as const,
      category: "research" as const,
      axesImpacted: ["reasoning"],
    },
    {
      date: "2015-12-01",
      title: "AlphaGo (first match vs Fan Hui)",
      description:
        "DeepMind's AlphaGo defeated European Go champion. Go was considered intractable for AI due to its complexity.",
      eventType: "reality" as const,
      category: "benchmark" as const,
      sourceUrl: "https://en.wikipedia.org/wiki/AlphaGo",
      axesImpacted: ["reasoning", "planning"],
    },
    {
      date: "2017-06-01",
      title: "Transformer (Attention is All You Need)",
      description:
        "Vaswani et al. introduced the Transformer. Became the backbone of GPT, BERT, and virtually all modern LLMs.",
      eventType: "reality" as const,
      category: "research" as const,
      sourceUrl: "https://arxiv.org/abs/1706.03762",
      axesImpacted: ["reasoning", "learning_efficiency"],
      significance: 5,
    },
    // LLM era
    {
      date: "2018-06-01",
      title: "BERT released",
      description:
        "Google's BERT achieved state-of-the-art on NLP via masked language modeling. Established pretrain-finetune paradigm.",
      eventType: "reality" as const,
      category: "model" as const,
      sourceUrl: "https://arxiv.org/abs/1810.04805",
      axesImpacted: ["reasoning"],
    },
    {
      date: "2019-02-01",
      title: "GPT-2 released",
      description:
        "OpenAI's GPT-2 demonstrated strong few-shot and zero-shot capabilities. Initially withheld over misuse concerns.",
      eventType: "reality" as const,
      category: "model" as const,
      sourceUrl: "https://openai.com/research/gpt-2",
      axesImpacted: ["reasoning"],
    },
    {
      date: "2019-10-01",
      title: "AlphaStar (StarCraft II)",
      description:
        "DeepMind's AlphaStar reached Grandmaster level in StarCraft II. Major milestone in long-horizon planning and real-time strategy.",
      eventType: "reality" as const,
      category: "benchmark" as const,
      sourceUrl:
        "https://www.deepmind.com/blog/alphastar-mastering-the-real-time-strategy-game-starcraft-ii",
      axesImpacted: ["planning", "tool_use"],
      significance: 4,
    },
    {
      date: "2020-07-01",
      title: "AlphaFold 2",
      description:
        "DeepMind's AlphaFold 2 solved protein structure prediction with near-experimental accuracy. Demonstrated AI's potential to solve fundamental scientific problems.",
      eventType: "reality" as const,
      category: "research" as const,
      sourceUrl:
        "https://www.deepmind.com/blog/alphafold-a-solution-to-a-50-year-old-grand-challenge-in-biology",
      axesImpacted: ["reasoning", "learning_efficiency"],
      isMilestone: true,
      significance: 5,
    },
    {
      date: "2020-05-01",
      title: "GPT-3 released",
      description:
        "OpenAI's 175B parameter model showed emergent few-shot learning. API access enabled widespread application development.",
      eventType: "reality" as const,
      category: "model" as const,
      sourceUrl: "https://arxiv.org/abs/2005.14165",
      axesImpacted: ["reasoning", "learning_efficiency"],
      significance: 5,
    },
    {
      date: "2020-11-01",
      title: "OECD AI Principles operationalized",
      description:
        "OECD Council adopted implementation plan for AI Principles. Influential framework for responsible AI policy.",
      eventType: "reality" as const,
      category: "policy" as const,
      sourceUrl: "https://www.oecd.org/digital/artificial-intelligence/",
      axesImpacted: ["alignment_safety"],
    },
    {
      date: "2021-03-01",
      title: "DALL-E 1",
      description:
        "OpenAI's DALL-E generated images from text. Early demonstration of multimodal capability.",
      eventType: "reality" as const,
      category: "model" as const,
      axesImpacted: ["reasoning"],
    },
    {
      date: "2021-08-01",
      title: "Codex (GitHub Copilot)",
      description:
        "OpenAI's Codex powers GitHub Copilot. First widely deployed AI coding assistant.",
      eventType: "reality" as const,
      category: "model" as const,
      sourceUrl: "https://github.com/features/copilot",
      axesImpacted: ["tool_use", "reasoning"],
    },
    {
      date: "2022-11-30",
      title: "ChatGPT launched",
      description:
        "OpenAI released ChatGPT. Rapid adoption demonstrated strong conversational and instruction-following capability.",
      eventType: "reality" as const,
      category: "model" as const,
      sourceUrl: "https://openai.com/chatgpt",
      axesImpacted: ["reasoning", "social_cognition"],
      significance: 5,
    },
    {
      date: "2023-03-14",
      title: "GPT-4 released",
      description:
        "OpenAI's GPT-4 achieved strong performance on bar exams, coding, and reasoning benchmarks. Multimodal capability.",
      eventType: "reality" as const,
      category: "model" as const,
      sourceUrl: "https://openai.com/research/gpt-4",
      axesImpacted: ["reasoning", "tool_use", "planning"],
      significance: 5,
    },
    {
      date: "2023-12-06",
      title: "EU AI Act adopted",
      description:
        "European Parliament and Council adopted the AI Act. First comprehensive AI regulation by risk tier.",
      eventType: "reality" as const,
      category: "policy" as const,
      sourceUrl:
        "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
      axesImpacted: ["alignment_safety"],
      significance: 5,
    },
    // Recent milestones (2024+)
    {
      date: "2024-01-01",
      title: "ARC Prize launched",
      description:
        "ARC-AGI Prize for solving AI2's Abstraction and Reasoning Corpus. Benchmark for generalization and true understanding.",
      eventType: "reality" as const,
      category: "benchmark" as const,
      sourceUrl: "https://arcprize.org",
      axesImpacted: ["reasoning", "learning_efficiency"],
    },
    {
      date: "2024-02-15",
      title: "Gemini 1.5 Pro",
      description:
        "Google's Gemini 1.5 with 1M token context. Major step in long-context and multimodal models.",
      eventType: "reality" as const,
      category: "model" as const,
      sourceUrl:
        "https://blog.google/technology/developers/gemini-api-developers-cloud/",
      axesImpacted: ["reasoning", "learning_efficiency"],
    },
    {
      date: "2024-03-01",
      title: "Claude 3 Opus",
      description:
        "Anthropic's Claude 3 Opus. Top-tier performance with emphasis on safety and long-context reasoning.",
      eventType: "reality" as const,
      category: "model" as const,
      sourceUrl: "https://www.anthropic.com/news/claude-3-model-family",
      axesImpacted: ["reasoning", "alignment_safety"],
    },
    {
      date: "2024-06-01",
      title: "SWE-bench Verified",
      description:
        "SWE-bench Verified: agents solving real GitHub issues. Key benchmark for software engineering automation.",
      eventType: "reality" as const,
      category: "benchmark" as const,
      sourceUrl: "https://www.swebench.com/",
      axesImpacted: ["tool_use", "planning", "reasoning"],
    },
    {
      date: "2024-07-01",
      title: "ARC-AGI 2024 prize results",
      description:
        "First ARC-AGI Prize results. Top solutions approached 50% on ARC-AGI, showing progress toward human-like abstraction.",
      eventType: "reality" as const,
      category: "benchmark" as const,
      sourceUrl: "https://arcprize.org/blog/arc-prize-2024",
      axesImpacted: ["reasoning", "learning_efficiency"],
    },
    {
      date: "2024-09-01",
      title: "o1 (OpenAI reasoning model)",
      description:
        "OpenAI's o1 model emphasized chain-of-thought and reasoning. Trained with process-based oversight.",
      eventType: "reality" as const,
      category: "model" as const,
      sourceUrl: "https://openai.com/index/introducing-o1/",
      axesImpacted: ["reasoning", "planning"],
      significance: 4,
    },
    {
      date: "2023-10-30",
      title: "US Executive Order on AI",
      description:
        "President Biden signed the Executive Order on Safe, Secure, and Trustworthy AI. Established safety testing requirements for dual-use foundation models.",
      eventType: "reality" as const,
      category: "policy" as const,
      sourceUrl:
        "https://www.whitehouse.gov/briefing-room/presidential-actions/2023/10/30/executive-order-on-the-safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/",
      axesImpacted: ["alignment_safety"],
      isMilestone: true,
      significance: 4,
    },
    {
      date: "2024-11-01",
      title: "Claude 3.5 Sonnet / Computer Use",
      description:
        "Anthropic released Claude 3.5 Sonnet with computer use capability. First major model with direct GUI interaction and tool use in desktop environments.",
      eventType: "reality" as const,
      category: "model" as const,
      sourceUrl: "https://www.anthropic.com/news/3-5-models-and-computer-use",
      axesImpacted: ["tool_use", "planning", "multimodal_perception"],
      isMilestone: true,
      significance: 4,
    },
    {
      date: "2024-12-01",
      title: "Gemini 2.0 & Project Astra",
      description:
        "Google DeepMind released Gemini 2.0 with native tool use and agentic capabilities. Project Astra demonstrated real-time multimodal AI assistants.",
      eventType: "reality" as const,
      category: "model" as const,
      sourceUrl: "https://deepmind.google/technologies/gemini/",
      axesImpacted: ["tool_use", "multimodal_perception", "reasoning"],
      isMilestone: true,
      significance: 4,
    },
    {
      date: "2025-01-20",
      title: "DeepSeek-R1 open weights",
      description:
        "DeepSeek released R1, a reasoning-focused model with open weights that matched frontier performance. Demonstrated viability of open-source frontier AI.",
      eventType: "reality" as const,
      category: "model" as const,
      sourceUrl: "https://github.com/deepseek-ai/DeepSeek-R1",
      axesImpacted: ["reasoning", "learning_efficiency"],
      isMilestone: true,
      significance: 4,
    },
    {
      date: "2025-05-01",
      title: "EU AI Act implementation begins",
      description:
        "Key provisions of the EU AI Act enter into force. High-risk AI systems require conformity assessment.",
      eventType: "reality" as const,
      category: "policy" as const,
      sourceUrl:
        "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
      axesImpacted: ["alignment_safety"],
    },
  ];

  // Clear existing reality events before re-seeding (idempotent)
  await db
    .delete(timelineEvents)
    .where(eq(timelineEvents.eventType, "reality"));

  await db.insert(timelineEvents).values(
    timelineSeedData.map((e) => ({
      date: e.date,
      title: e.title,
      description: e.description,
      eventType: e.eventType,
      category: e.category,
      sourceUrl: e.sourceUrl ?? null,
      axesImpacted: e.axesImpacted ?? null,
      isMilestone: e.isMilestone ?? true,
      significance: e.significance ?? 3,
    })),
  );

  console.log(`  Inserted ${timelineSeedData.length} timeline events.`);
  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
