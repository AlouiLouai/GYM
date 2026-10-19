import { OneEuroFilter } from "../smoothing/one-euro";
import { RepDetector } from "./rep-detector";
import type {
  CheckConfig,
  EngineEvent,
  ExerciseConfig,
  Fault,
  PoseFrame,
  RepCandidate,
  RepResult,
} from "./types";

const BASE_SCORE = 100;
const DEFAULT_FAULT_PENALTY = 15;
const TEMPO_PENALTY = 10;
/** A live fault must persist this many consecutive frames (~100 ms) so one noisy frame can't trigger a cue. */
const LIVE_CONFIRM_FRAMES = 3;

interface CheckSample {
  t: number;
  values: (number | null)[];
}

export interface FrameOutput {
  /** Smoothed primary signal, or null if the pose was not measurable. */
  signal: number | null;
  events: EngineEvent[];
}

const violates = (check: CheckConfig, value: number) =>
  (check.warnAbove !== undefined && value > check.warnAbove) ||
  (check.warnBelow !== undefined && value < check.warnBelow);

/**
 * Per-exercise coaching engine: smooths the movement signal, counts reps,
 * evaluates form checks and produces a score.
 *
 * Faults are reported twice on purpose: as `live` events the moment they are
 * confirmed (so the lifter can be coached mid-rep), and again in the final `rep`
 * result (for scoring and the set summary) with `announced: true` so the UI doesn't repeat itself.
 *
 * Pure TypeScript with no DOM dependencies, so it is testable and reusable anywhere.
 */
export class ExerciseEngine {
  private readonly detector: RepDetector;
  private readonly filter = new OneEuroFilter({ minCutoff: 1.5, beta: 0.05 });
  private samples: CheckSample[] = [];
  private repCount = 0;

  // Live (mid-rep) state, reset at the start of every rep.
  private liveFired = new Set<string>();
  private streaks: number[];
  private extremes: (number | null)[];

  constructor(readonly config: ExerciseConfig) {
    this.detector = new RepDetector(config.rep);
    this.streaks = config.checks.map(() => 0);
    this.extremes = config.checks.map(() => null);
  }

  get reps(): number {
    return this.repCount;
  }

  reset() {
    this.detector.reset();
    this.filter.reset();
    this.samples = [];
    this.repCount = 0;
    this.resetLive();
  }

  /** Call when no person is detected so an unfinished rep is not stitched to a later one. */
  markLost(t: number) {
    this.detector.lost(t);
    if (!this.detector.active) this.resetLive();
    this.samples = [];
  }

  process(frame: PoseFrame): FrameOutput {
    const raw = this.config.signal(frame);
    if (raw === null || !Number.isFinite(raw)) {
      this.markLost(frame.t);
      return { signal: null, events: [] };
    }

    const signal = this.filter.filter(raw, frame.t);
    const before = this.detector.currentPhase;
    const event = this.detector.process(frame.t, signal);
    const after = this.detector.currentPhase;

    if (before !== "out" && before !== "back" && after === "out") this.resetLive();
    const turnaround = before === "out" && after === "back";

    const events: EngineEvent[] = [];
    if (this.detector.active || event) {
      const values = this.config.checks.map((check) => check.measure(frame));
      this.samples.push({ t: frame.t, values });
      if (this.detector.active) events.push(...this.evaluateLive(values, turnaround));
    } else {
      this.samples = [];
    }

    if (!event) return { signal, events };

    const samples = this.samples;
    this.samples = [];
    if (event.type === "partial") {
      events.push({
        type: "partial",
        rep: {
          exercise: this.config.id,
          startT: event.rep.startT,
          endT: event.rep.endT,
          rangeOfMotion: event.rep.rangeOfMotion,
          extremeValue: event.rep.extremeValue,
          cue: this.config.cues.partial,
          announced: this.liveFired.has("depth"),
        },
      });
    } else {
      events.push({ type: "rep", rep: this.buildRep(event.rep, samples) });
    }
    this.resetLive();
    return { signal, events };
  }

  private resetLive() {
    this.liveFired = new Set();
    this.streaks = this.config.checks.map(() => 0);
    this.extremes = this.config.checks.map(() => null);
  }

  /** Detects faults while the rep is still happening. Each fault fires at most once per rep. */
  private evaluateLive(values: (number | null)[], turnaround: boolean): EngineEvent[] {
    const { config } = this;
    const out: EngineEvent[] = [];
    const fire = (fault: Fault) => {
      if (this.liveFired.has(fault.id)) return;
      this.liveFired.add(fault.id);
      out.push({ type: "live", exercise: config.id, fault: { ...fault, announced: true } });
    };

    // Turnaround is the earliest moment depth and lowering speed are knowable.
    if (turnaround) {
      if (!this.detector.reachedFullRange) {
        fire({ id: "depth", label: "Not deep enough", cue: config.cues.partial });
      }
      if (config.eccentric === "out") {
        const outMs = this.detector.turnaroundT - this.detector.repStartT;
        if (outMs < config.minEccentricMs) {
          fire({ id: "tempo", label: "Lowering too fast", cue: config.cues.tooFast });
        }
      }
    }

    config.checks.forEach((check, i) => {
      const value = values[i];
      if (value === null || value === undefined) {
        this.streaks[i] = 0;
        return;
      }
      if (check.stat === "atBottom") {
        if (turnaround && violates(check, value)) {
          fire({ id: check.id, label: check.label, cue: check.cue, value });
        }
        return;
      }
      const prev = this.extremes[i] ?? value;
      const extreme = check.stat === "max" ? Math.max(prev, value) : Math.min(prev, value);
      this.extremes[i] = extreme;
      this.streaks[i] = violates(check, value) ? this.streaks[i] + 1 : 0;
      if (this.streaks[i] >= LIVE_CONFIRM_FRAMES) {
        fire({ id: check.id, label: check.label, cue: check.cue, value: extreme });
      }
    });

    return out;
  }

  private buildRep(candidate: RepCandidate, samples: CheckSample[]): RepResult {
    const { config } = this;
    const faults: Fault[] = [];
    let penalty = 0;

    config.checks.forEach((check, i) => {
      const value = judgedValue(check, samples, i, candidate.bottomT);
      if (value === null || !violates(check, value)) return;
      faults.push({
        id: check.id,
        label: check.label,
        cue: check.cue,
        value,
        announced: this.liveFired.has(check.id),
      });
      penalty += check.penalty ?? DEFAULT_FAULT_PENALTY;
    });

    const eccentricMs =
      config.eccentric === "out" ? candidate.timing.outMs : candidate.timing.backMs;
    const concentricMs =
      config.eccentric === "out" ? candidate.timing.backMs : candidate.timing.outMs;
    if (eccentricMs < config.minEccentricMs) {
      faults.push({
        id: "tempo",
        label: "Lowering too fast",
        cue: config.cues.tooFast,
        announced: this.liveFired.has("tempo"),
      });
      penalty += TEMPO_PENALTY;
    }

    this.repCount += 1;
    return {
      index: this.repCount,
      exercise: config.id,
      startT: candidate.startT,
      endT: candidate.endT,
      rangeOfMotion: candidate.rangeOfMotion,
      extremeValue: candidate.extremeValue,
      eccentricMs,
      concentricMs,
      totalMs: candidate.timing.totalMs,
      faults,
      score: Math.max(0, BASE_SCORE - penalty),
    };
  }
}

function judgedValue(
  check: CheckConfig,
  samples: CheckSample[],
  index: number,
  bottomT: number,
): number | null {
  const measured = samples
    .map((s) => ({ t: s.t, v: s.values[index] }))
    .filter((s): s is { t: number; v: number } => s.v !== null && s.v !== undefined);
  if (measured.length === 0) return null;

  switch (check.stat) {
    case "max":
      return Math.max(...measured.map((s) => s.v));
    case "min":
      return Math.min(...measured.map((s) => s.v));
    case "atBottom": {
      let nearest = measured[0];
      for (const s of measured) {
        if (Math.abs(s.t - bottomT) < Math.abs(nearest.t - bottomT)) nearest = s;
      }
      return nearest.v;
    }
  }
}
