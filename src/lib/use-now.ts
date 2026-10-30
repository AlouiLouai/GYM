"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, MINUTE / 2);
  return () => clearInterval(id);
}

// Rounded to the minute so the snapshot is stable between calls, as useSyncExternalStore requires.
const snapshot = () => Math.floor(Date.now() / MINUTE) * MINUTE;

/**
 * Current time for rendering "today", streaks and the like. 0 during prerender (where reading the
 * clock is not allowed with Cache Components); saved history is client-only anyway.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, snapshot, () => 0);
}
