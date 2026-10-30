import type { SetSummary } from "../engine/set-summary";
import type { ExerciseId } from "../engine/types";
import { EXERCISES } from "../exercises/definitions";
import type { Lang } from "../i18n";

// Browser-safe half of the coach API contract: plain types and mapping, with no zod.
// The runtime validator lives in schema.ts and is imported by the server route only,
// so the validation library never ships to the client.

export interface SetStats {
  reps: number;
  partialReps: number;
  avgScore: number;
  avgRangeOfMotion: number;
  avgEccentricMs: number;
  faults: { id: string; count: number }[];
  fatigue: {
    romChangePct: number;
    eccentricChangePct: number;
    scoreChange: number;
  } | null;
}

export interface CoachRequest {
  exercise: ExerciseId;
  current: SetStats;
  previous: SetStats | null;
  /** Language the note is written in. Optional so older clients keep working. */
  lang?: Lang;
}

/** Every fault id the engine can produce, with its display label. */
export const FAULT_LABELS: Record<string, string> = {
  depth: "Not deep enough",
  tempo: "Lowering too fast",
};
for (const exercise of Object.values(EXERCISES)) {
  for (const check of exercise.checks) FAULT_LABELS[check.id] = check.label;
}

export const faultLabel = (id: string) => FAULT_LABELS[id] ?? id;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function toStats(s: SetSummary): SetStats {
  return {
    reps: s.reps,
    partialReps: s.partialReps,
    avgScore: s.avgScore,
    avgRangeOfMotion: s.avgRangeOfMotion,
    avgEccentricMs: s.avgEccentricMs,
    faults: Object.entries(s.faultCounts).map(([id, v]) => ({ id, count: v.count })),
    fatigue: s.fatigue && {
      romChangePct: clamp(Math.round(s.fatigue.romChangePct), -100, 500),
      eccentricChangePct: clamp(Math.round(s.fatigue.eccentricChangePct), -100, 1000),
      scoreChange: clamp(Math.round(s.fatigue.scoreChange), -100, 100),
    },
  };
}

/** Only numbers and known ids leave the device: no video, no free text. */
export function toCoachRequest(current: SetSummary, previous: SetSummary | null, lang: Lang = "en"): CoachRequest {
  return {
    exercise: current.exercise,
    current: toStats(current),
    previous: previous && toStats(previous),
    lang,
  };
}
