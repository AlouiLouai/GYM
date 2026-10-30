"use client";

import type { SetRecord } from "@/core/history/stats";
import { EXERCISES } from "@/core/exercises/definitions";
import { createPersistentStore } from "./persistent-store";

// Sets are tiny (~150 bytes), so a capped array in localStorage is plenty: 3000 sets is
// years of training at well under 1 MB.
const MAX_RECORDS = 3000;
const EMPTY: SetRecord[] = [];

const num = (v: unknown, fallback: number | null = null) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

function revive(raw: unknown): SetRecord[] {
  if (!Array.isArray(raw)) return EMPTY;
  return raw.flatMap((r): SetRecord[] => {
    if (!r || typeof r !== "object" || !(r.exercise in EXERCISES) || typeof r.id !== "string") return [];
    return [
      {
        id: r.id,
        at: num(r.at, 0)!,
        exercise: r.exercise,
        reps: num(r.reps, 0)!,
        partialReps: num(r.partialReps, 0)!,
        avgScore: num(r.avgScore, 0)!,
        weightKg: num(r.weightKg),
        rpe: num(r.rpe),
        topFault: typeof r.topFault === "string" ? r.topFault : null,
      },
    ];
  });
}

const store = createPersistentStore<SetRecord[]>("gym-coach:history", EMPTY, revive);

export const useHistory = store.use;
export const getHistory = store.get;

export function addSet(record: SetRecord) {
  store.set((prev) => [...prev, record].slice(-MAX_RECORDS));
}

export function updateSet(id: string, patch: Partial<Omit<SetRecord, "id">>) {
  store.set((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

export function deleteSet(id: string) {
  store.set((prev) => prev.filter((r) => r.id !== id));
}

export function clearHistory() {
  store.set(EMPTY);
}

/** The most recent saved set of this exercise, other than `excludeId`. */
export function lastSetOf(records: readonly SetRecord[], exercise: SetRecord["exercise"], excludeId?: string) {
  return records.findLast((r) => r.exercise === exercise && r.id !== excludeId) ?? null;
}
