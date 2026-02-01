/**
 * Zustand store for Capability Profile page.
 * @see docs/features/07-capability-profile.md
 */

import { create } from "zustand";

export type SortOption = "alphabetical" | "score" | "recentChange";

export interface CapabilityProfileState {
  selectedDate: string | null;
  activeAxis: string | null;
  filters: {
    benchmarksOnly: boolean;
    includeClaims: boolean;
    showSpeculative: boolean;
  };
  sortBy: SortOption;
  setSelectedDate: (date: string | null) => void;
  setActiveAxis: (axis: string | null) => void;
  setFilters: (filters: Partial<CapabilityProfileState["filters"]>) => void;
  setSortBy: (sort: SortOption) => void;
}

export const useCapabilityProfileStore = create<CapabilityProfileState>(
  (set) => ({
    selectedDate: null,
    activeAxis: null,
    filters: {
      benchmarksOnly: false,
      includeClaims: true,
      showSpeculative: false,
    },
    sortBy: "score",
    setSelectedDate: (date) => set({ selectedDate: date }),
    setActiveAxis: (axis) => set({ activeAxis: axis }),
    setFilters: (updates) =>
      set((s) => ({ filters: { ...s.filters, ...updates } })),
    setSortBy: (sortBy) => set({ sortBy }),
  }),
);
