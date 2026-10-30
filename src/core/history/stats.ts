import type { ExerciseId } from "../engine/types";

/** One saved set. Weight is stored in kg and converted for display. */
export interface SetRecord {
  id: string;
  /** Epoch ms when the set was finished. */
  at: number;
  exercise: ExerciseId;
  reps: number;
  partialReps: number;
  avgScore: number;
  /** null = bodyweight / not entered. */
  weightKg: number | null;
  /** Rate of perceived exertion, 6–10. */
  rpe: number | null;
  topFault: string | null;
  /** Seconds held, for timed holds (plank, wall sit); reps is 0 for those. */
  holdSec?: number;
}

export type Unit = "kg" | "lb";

const LB_PER_KG = 2.20462;
export const toKg = (value: number, unit: Unit) => (unit === "kg" ? value : value / LB_PER_KG);
/** Display value in the user's unit, rounded to 0.5. */
export const fromKg = (kg: number, unit: Unit) => Math.round((unit === "kg" ? kg : kg * LB_PER_KG) * 2) / 2;
export const formatWeight = (kg: number, unit: Unit) => `${fromKg(kg, unit)} ${unit}`;

/** Epley estimated one-rep max. */
export function estimateOneRepMax(kg: number, reps: number): number {
  if (reps <= 0) return 0;
  return reps === 1 ? kg : kg * (1 + reps / 30);
}

export interface ExerciseRecords {
  exercise: ExerciseId;
  sets: number;
  bestWeight: { kg: number; reps: number } | null;
  bestE1rm: number | null;
  bestScore: number;
  mostReps: number;
  /** Longest hold in seconds, 0 if the exercise isn't a hold. */
  longestHoldSec: number;
}

export function personalRecords(records: readonly SetRecord[]): ExerciseRecords[] {
  const by = new Map<ExerciseId, ExerciseRecords>();
  for (const r of records) {
    const pr = by.get(r.exercise) ?? {
      exercise: r.exercise,
      sets: 0,
      bestWeight: null,
      bestE1rm: null,
      bestScore: 0,
      mostReps: 0,
      longestHoldSec: 0,
    };
    pr.sets += 1;
    pr.bestScore = Math.max(pr.bestScore, r.reps > 0 || r.holdSec ? r.avgScore : 0);
    pr.mostReps = Math.max(pr.mostReps, r.reps);
    pr.longestHoldSec = Math.max(pr.longestHoldSec, r.holdSec ?? 0);
    if (r.weightKg && r.reps > 0) {
      if (!pr.bestWeight || r.weightKg > pr.bestWeight.kg || (r.weightKg === pr.bestWeight.kg && r.reps > pr.bestWeight.reps)) {
        pr.bestWeight = { kg: r.weightKg, reps: r.reps };
      }
      pr.bestE1rm = Math.max(pr.bestE1rm ?? 0, estimateOneRepMax(r.weightKg, r.reps));
    }
    by.set(r.exercise, pr);
  }
  return [...by.values()].sort((a, b) => b.sets - a.sets);
}

export type PrKind = "weight" | "e1rm" | "reps" | "hold";

/**
 * Whether `record` beats every earlier set of the same exercise. The first ever set is not a PR:
 * there is nothing to beat yet, and celebrating it would make PRs meaningless.
 */
export function newPr(earlier: readonly SetRecord[], record: SetRecord): PrKind | null {
  const same = earlier.filter((r) => r.exercise === record.exercise && r.id !== record.id);
  if (same.length === 0) return null;
  if (record.holdSec !== undefined) {
    return record.holdSec > Math.max(...same.map((r) => r.holdSec ?? 0)) ? "hold" : null;
  }
  if (record.reps === 0) return null;
  if (record.weightKg) {
    const weighted = same.filter((r) => r.weightKg && r.reps > 0);
    if (weighted.length === 0) return null;
    const heaviest = Math.max(...weighted.map((r) => r.weightKg!));
    if (record.weightKg > heaviest) return "weight";
    const best = Math.max(...weighted.map((r) => estimateOneRepMax(r.weightKg!, r.reps)));
    if (estimateOneRepMax(record.weightKg, record.reps) > best + 0.01) return "e1rm";
    return null;
  }
  const unweighted = same.filter((r) => !r.weightKg);
  if (unweighted.length === 0) return null;
  return record.reps > Math.max(...unweighted.map((r) => r.reps)) ? "reps" : null;
}

/** Local calendar day, e.g. "2026-10-30". */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY_MS = 86_400_000;

/**
 * Consecutive training days ending today, or ending yesterday if today's session hasn't happened yet
 * (so a streak doesn't look broken in the morning).
 */
export function currentStreak(records: readonly SetRecord[], now: number): number {
  const days = new Set(records.map((r) => dayKey(r.at)));
  let cursor = now;
  if (!days.has(dayKey(cursor))) cursor -= DAY_MS;
  let streak = 0;
  // Step by calendar day at noon to stay clear of DST shifts.
  const noon = new Date(cursor);
  noon.setHours(12, 0, 0, 0);
  while (days.has(dayKey(noon.getTime()))) {
    streak += 1;
    noon.setDate(noon.getDate() - 1);
  }
  return streak;
}

export function setsInLastDays(records: readonly SetRecord[], days: number, now: number): number {
  return records.filter((r) => now - r.at < days * DAY_MS).length;
}

/** Newest day first, sets newest first within a day. */
export function groupByDay(records: readonly SetRecord[]): { day: string; sets: SetRecord[] }[] {
  const groups = new Map<string, SetRecord[]>();
  for (const r of [...records].sort((a, b) => b.at - a.at)) {
    const key = dayKey(r.at);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups].map(([day, sets]) => ({ day, sets }));
}

export interface WeekStats {
  /** Local day key of the week's Monday. */
  week: string;
  sets: number;
  reps: number;
  /** Sum of weight × reps over weighted sets. */
  volumeKg: number;
  holdSec: number;
}

/** Monday 00:00 (local) of the week containing `ts`. */
export function weekStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** Totals for the last `weeks` calendar weeks (Monday start), oldest first, including empty weeks. */
export function weeklyStats(records: readonly SetRecord[], weeks: number, now: number): WeekStats[] {
  const out: WeekStats[] = [];
  const cursor = new Date(weekStart(now));
  for (let i = 0; i < weeks; i++) {
    out.unshift({ week: dayKey(cursor.getTime()), sets: 0, reps: 0, volumeKg: 0, holdSec: 0 });
    cursor.setDate(cursor.getDate() - 7);
  }
  const index = new Map(out.map((w, i) => [w.week, i]));
  for (const r of records) {
    const i = index.get(dayKey(weekStart(r.at)));
    if (i === undefined) continue;
    const w = out[i];
    w.sets += 1;
    w.reps += r.reps;
    w.volumeKg += (r.weightKg ?? 0) * r.reps;
    w.holdSec += r.holdSec ?? 0;
  }
  return out;
}
