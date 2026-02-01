"use client";

import { CapabilityRadar } from "./capability-radar";
import type { Snapshot, SnapshotHistoryEntry } from "@/lib/home/types";

interface HeroSectionProps {
  snapshot: Snapshot | null;
  history: SnapshotHistoryEntry[];
  radarSize: number;
  showGhosts: boolean;
  /** Axis keys to highlight (e.g. from active canary filter). */
  highlightAxes?: string[];
}

export function HeroSection({
  snapshot,
  history,
  radarSize,
  showGhosts,
  highlightAxes,
}: HeroSectionProps) {
  return (
    <section
      className="relative rounded-xl border border-border bg-card/50 py-8 sm:py-12 md:py-14 px-4 sm:px-6 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, var(--canary-accent), transparent)",
        }}
      />

      <div className="relative max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <header className="text-center">
          <h1
            id="hero-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground"
          >
            <span className="text-foreground">AGI</span>{" "}
            <span className="text-canary-accent">Canary</span> Watcher
          </h1>
        </header>

        <div className="flex justify-center">
          <div className="transition-opacity duration-500 ease-out">
            <CapabilityRadar
              snapshot={snapshot}
              history={showGhosts ? history : []}
              size={radarSize}
              highlightAxes={highlightAxes}
              className="drop-shadow-[0_0_24px_rgba(78,161,255,0.08)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
