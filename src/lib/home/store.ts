/**
 * Zustand store for Home Page client state.
 * @see docs/features/06-home-page.md
 */

import { create } from "zustand";

export interface HomeState {
  selectedRadarAxis: string | null;
  hoveredCanaryId: string | null;
  radarDays: number;
  setSelectedRadarAxis: (axis: string | null) => void;
  setHoveredCanaryId: (id: string | null) => void;
  setRadarDays: (days: number) => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  selectedRadarAxis: null,
  hoveredCanaryId: null,
  radarDays: 90,
  setSelectedRadarAxis: (axis) => set({ selectedRadarAxis: axis }),
  setHoveredCanaryId: (id) => set({ hoveredCanaryId: id }),
  setRadarDays: (days) => set({ radarDays: days }),
}));
