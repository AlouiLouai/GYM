"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny localStorage-backed store for useSyncExternalStore. The server snapshot is always the
 * fallback, so pages prerender with defaults and switch to the saved value after hydration.
 * Storage can throw (private mode, quota, blocked site data); the app then just doesn't persist.
 */
export function createPersistentStore<T>(key: string, fallback: T, revive: (raw: unknown) => T) {
  let cache: T | undefined;
  const listeners = new Set<() => void>();

  const read = (): T => {
    if (cache !== undefined) return cache;
    try {
      const raw = localStorage.getItem(key);
      cache = raw === null ? fallback : revive(JSON.parse(raw));
    } catch {
      cache = fallback;
    }
    return cache;
  };

  const set = (next: T | ((prev: T) => T)) => {
    cache = typeof next === "function" ? (next as (prev: T) => T)(read()) : next;
    try {
      localStorage.setItem(key, JSON.stringify(cache));
    } catch {
      // Not persisted; the in-memory value still works for this visit.
    }
    for (const l of listeners) l();
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    // Keep other tabs in sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      cache = undefined;
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  const use = (): T => useSyncExternalStore(subscribe, read, () => fallback);

  return { get: read, set, use };
}
