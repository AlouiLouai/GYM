"use client";

import { VOICE_MODES, type VoiceMode } from "@/core/coach/voice-policy";
import type { ExerciseId } from "@/core/engine/types";
import { EXERCISES } from "@/core/exercises/definitions";
import { BARS } from "@/core/history/plates";
import type { Unit } from "@/core/history/stats";
import { isLang, type Lang } from "@/core/i18n";
import { SETTINGS_KEY } from "./document-lang-script";
import { createPersistentStore } from "./persistent-store";

export interface Settings {
  lang: Lang;
  voiceMode: VoiceMode;
  /** Exact speechSynthesis voice name, or null for the best available voice. */
  voiceName: string | null;
  unit: Unit;
  /** Rest timer length in seconds; 0 = off. */
  restSec: number;
  /** Default reps per set; null = no target. */
  targetReps: number | null;
  debug: boolean;
  /** End the set after this many seconds without a rep; 0 = off. */
  autoFinishSec: number;
  /** Short vibration on each rep (double on a fault). */
  haptics: boolean;
  favorites: ExerciseId[];
  /** Most recently used first; recent[0] is reopened on the next visit. */
  recent: ExerciseId[];
  /** The first-run "how it works" card was dismissed. */
  seenIntro: boolean;
  /** Empty-bar weight for the plate calculator, per unit, in that unit. */
  bar: Record<Unit, number>;
}

export const REST_OPTIONS = [0, 60, 90, 120, 180] as const;
export const TARGET_OPTIONS = [null, 5, 8, 10, 12, 15, 20] as const;
export const AUTO_FINISH_OPTIONS = [0, 8, 12, 20] as const;
const MAX_RECENT = 6;

export const DEFAULT_SETTINGS: Settings = {
  lang: "en",
  voiceMode: "smart",
  voiceName: null,
  unit: "kg",
  restSec: 90,
  targetReps: null,
  debug: false,
  autoFinishSec: 12,
  haptics: true,
  favorites: [],
  recent: [],
  seenIntro: false,
  bar: { kg: 20, lb: 45 },
};

const exerciseIds = (v: unknown): ExerciseId[] =>
  Array.isArray(v) ? [...new Set(v.filter((id): id is ExerciseId => typeof id === "string" && id in EXERCISES))] : [];

const barOf = (raw: unknown, unit: Unit): number => {
  const value = (raw as Partial<Record<Unit, unknown>> | undefined)?.[unit];
  return typeof value === "number" && BARS[unit].includes(value) ? value : DEFAULT_SETTINGS.bar[unit];
};

/** Accepts only known values, so a stale or hand-edited entry can't break the app. */
function revive(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof Settings, unknown>>;
  const d = DEFAULT_SETTINGS;
  return {
    lang: isLang(r.lang) ? r.lang : d.lang,
    voiceMode: VOICE_MODES.includes(r.voiceMode as VoiceMode) ? (r.voiceMode as VoiceMode) : d.voiceMode,
    voiceName: typeof r.voiceName === "string" ? r.voiceName : null,
    unit: r.unit === "lb" ? "lb" : "kg",
    restSec: REST_OPTIONS.includes(r.restSec as never) ? (r.restSec as number) : d.restSec,
    targetReps: TARGET_OPTIONS.includes(r.targetReps as never) ? (r.targetReps as number | null) : d.targetReps,
    debug: r.debug === true,
    autoFinishSec: AUTO_FINISH_OPTIONS.includes(r.autoFinishSec as never) ? (r.autoFinishSec as number) : d.autoFinishSec,
    haptics: r.haptics !== false,
    favorites: exerciseIds(r.favorites),
    recent: exerciseIds(r.recent).slice(0, MAX_RECENT),
    seenIntro: r.seenIntro === true,
    bar: { kg: barOf(r.bar, "kg"), lb: barOf(r.bar, "lb") },
  };
}

const store = createPersistentStore<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS, revive);

export const useSettings = store.use;
export const getSettings = store.get;

export function updateSettings(patch: Partial<Settings>) {
  store.set((prev) => ({ ...prev, ...patch }));
}

export function toggleFavorite(id: ExerciseId) {
  store.set((prev) => ({
    ...prev,
    favorites: prev.favorites.includes(id) ? prev.favorites.filter((f) => f !== id) : [...prev.favorites, id],
  }));
}

export function markRecent(id: ExerciseId) {
  store.set((prev) => ({ ...prev, recent: [id, ...prev.recent.filter((r) => r !== id)].slice(0, MAX_RECENT) }));
}
