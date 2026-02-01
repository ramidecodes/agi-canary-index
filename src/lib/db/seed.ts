/**
 * Seed script for AGI Canary Watcher database.
 * Run: pnpm run db:seed
 * Requires DATABASE_URL in .env and migrations applied.
 * @see docs/features/02-source-registry.md for source list.
 */

import "dotenv/config";
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
  const existingNames = new Set(
    (await db.select({ name: sources.name }).from(sources)).map((r) => r.name),
  );
  let inserted = 0;
  for (const s of SEED_SOURCES) {
    if (existingNames.has(s.name)) continue;
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
    existingNames.add(s.name);
    inserted++;
  }
  console.log(
    `  Inserted ${inserted} sources; ${existingNames.size} total names in registry.`,
  );

  console.log("Seeding sample timeline events...");
  await db.insert(timelineEvents).values([
    {
      date: "2024-01-01",
      title: "Sample reality event",
      description: "Benchmark or policy milestone (example).",
      eventType: "reality",
      category: "benchmark",
      axesImpacted: ["reasoning"],
    },
    {
      date: "2024-06-01",
      title: "Sample speculative event",
      description: "Future or hypothetical scenario (example).",
      eventType: "speculative",
      category: "archetype",
    },
  ]);

  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
