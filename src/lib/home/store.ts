/**
 * Zustand store for Home Page client state.
 * @see docs/features/06-home-page.md
 */

import { create } from "zustand";

export interface HomeState {
  selectedRadarAxis: string | null;
  hoveredCanaryId: string | null;
  radarDays: number;
  /** Active canary filter (canary id); used to filter radar highlight and brief. */
  activeCanaryFilter: string | null;
  setSelectedRadarAxis: (axis: string | null) => void;
  setHoveredCanaryId: (id: string | null) => void;
  setRadarDays: (days: number) => void;
  setCanaryFilter: (filter: string | null) => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  selectedRadarAxis: null,
  hoveredCanaryId: null,
  radarDays: 90,
  activeCanaryFilter: null,
  setSelectedRadarAxis: (axis) => set({ selectedRadarAxis: axis }),
  setHoveredCanaryId: (id) => set({ hoveredCanaryId: id }),
  setRadarDays: (days) => set({ radarDays: days }),
  setCanaryFilter: (filter) => set({ activeCanaryFilter: filter }),
}));
