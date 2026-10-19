import type { ExerciseId, PartialRepResult, RepResult } from "./types";

export interface FatigueTrend {
  /** Change in range of motion, last half vs first half of the set, in percent. */
  romChangePct: number;
  /** Change in lowering time, in percent. Negative = getting faster/sloppier. */
  eccentricChangePct: number;
  /** Change in form score, in points. */
  scoreChange: number;
}

export interface SetSummary {
  exercise: ExerciseId;
  reps: number;
  partialReps: number;
  avgScore: number;
  avgRangeOfMotion: number;
  avgEccentricMs: number;
  avgConcentricMs: number;
  bestRep: number | null;
  worstRep: number | null;
  faultCounts: Record<string, { label: string; count: number }>;
  topFault: { id: string; label: string; count: number } | null;
  /** Needs at least 4 reps to compare halves meaningfully. */
  fatigue: FatigueTrend | null;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pctChange = (from: number, to: number) => (from === 0 ? 0 : ((to - from) / from) * 100);

export function summarizeSet(
  exercise: ExerciseId,
  reps: readonly RepResult[],
  partials: readonly PartialRepResult[] = [],
): SetSummary {
  const faultCounts: SetSummary["faultCounts"] = {};
  for (const rep of reps) {
    for (const fault of rep.faults) {
      const entry = (faultCounts[fault.id] ??= { label: fault.label, count: 0 });
      entry.count += 1;
    }
  }
  const top = Object.entries(faultCounts).sort((a, b) => b[1].count - a[1].count)[0];

  let fatigue: FatigueTrend | null = null;
  if (reps.length >= 4) {
    const half = Math.floor(reps.length / 2);
    const first = reps.slice(0, half);
    const last = reps.slice(reps.length - half);
    fatigue = {
      romChangePct: pctChange(mean(first.map((r) => r.rangeOfMotion)), mean(last.map((r) => r.rangeOfMotion))),
      eccentricChangePct: pctChange(mean(first.map((r) => r.eccentricMs)), mean(last.map((r) => r.eccentricMs))),
      scoreChange: mean(last.map((r) => r.score)) - mean(first.map((r) => r.score)),
    };
  }

  const byScore = [...reps].sort((a, b) => b.score - a.score);
  return {
    exercise,
    reps: reps.length,
    partialReps: partials.length,
    avgScore: Math.round(mean(reps.map((r) => r.score))),
    avgRangeOfMotion: Math.round(mean(reps.map((r) => r.rangeOfMotion))),
    avgEccentricMs: Math.round(mean(reps.map((r) => r.eccentricMs))),
    avgConcentricMs: Math.round(mean(reps.map((r) => r.concentricMs))),
    bestRep: byScore[0]?.index ?? null,
    worstRep: byScore.at(-1)?.index ?? null,
    faultCounts,
    topFault: top ? { id: top[0], label: top[1].label, count: top[1].count } : null,
    fatigue,
  };
}

export interface SetComparison {
  repsDelta: number;
  scoreDelta: number;
  /** Range of motion change in signal units (degrees for angle-based exercises). */
  romDelta: number;
  eccentricDeltaMs: number;
}

/** How `current` differs from the previous set of the same exercise: positive = more/better. */
export function compareSets(previous: SetSummary, current: SetSummary): SetComparison {
  return {
    repsDelta: current.reps - previous.reps,
    scoreDelta: current.avgScore - previous.avgScore,
    romDelta: current.avgRangeOfMotion - previous.avgRangeOfMotion,
    eccentricDeltaMs: current.avgEccentricMs - previous.avgEccentricMs,
  };
}
