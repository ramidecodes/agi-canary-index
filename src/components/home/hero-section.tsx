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
      className="relative rounded-xl border border-border/80 bg-card/60 dark:bg-card/50 backdrop-blur-md py-8 sm:py-12 md:py-14 px-4 sm:px-6 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset]"
      aria-labelledby="hero-heading"
    >
      {/* Gradient overlay — clearly visible for control-room feel */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.12] dark:opacity-[0.28]"
        style={{
          background:
            "radial-gradient(ellipse 85% 55% at 50% 0%, var(--canary-accent), transparent 65%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08] dark:opacity-[0.22]"
        style={{
          background:
            "radial-gradient(ellipse 65% 45% at 50% 45%, var(--chart-1), transparent 55%)",
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
