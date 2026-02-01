"use client";

import { useSyncExternalStore } from "react";

/**
 * Breakpoint: mobile < 640px (sm), tablet 640–1024 (lg), desktop > 1024.
 * @see docs/features/12-mobile-design.md
 */
const MOBILE_BREAKPOINT = 640;

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getServerSnapshot() {
  return false;
}

/** True when viewport width < 640px. Use for conditional UI (e.g. simplified radar). */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
