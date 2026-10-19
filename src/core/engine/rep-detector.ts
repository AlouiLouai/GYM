import type { DetectorEvent, DetectorPhase, RepCandidate, RepDetectorConfig } from "./types";

/**
 * Turns a 1-D movement signal into reps.
 *
 * Internally the signal is flipped so that "start position" is always the HIGH side
 * (`x`), which lets one state machine serve every exercise:
 *
 *   idle ──(reach start zone)──▶ rest ──(leave start zone)──▶ out ──(turnaround)──▶ back
 *                                  ▲                                                 │
 *                                  └─────────────(return to start zone)──────────────┘
 *
 * Hysteresis (`minExcursion`, `reversal`) keeps sensor jitter from creating phantom reps.
 */
export class RepDetector {
  private phase: DetectorPhase = "idle";
  private readonly sign: 1 | -1;
  private readonly restX: number;
  private readonly workX: number;

  private startT = 0;
  private restPeak = 0;
  private maxX = 0;
  private minX = 0;
  private bottomT = 0;
  private lastT = 0;

  constructor(private readonly config: RepDetectorConfig) {
    this.sign = config.direction === "decreasing" ? 1 : -1;
    this.restX = this.sign * config.restThreshold;
    this.workX = this.sign * config.workThreshold;
  }

  get currentPhase(): DetectorPhase {
    return this.phase;
  }

  /** True while a rep is in progress (between leaving and re-entering the start zone). */
  get active(): boolean {
    return this.phase === "out" || this.phase === "back";
  }

  /** Time the rep in progress left the start zone. */
  get repStartT(): number {
    return this.startT;
  }

  /** Whether the rep in progress has already reached the full-range threshold. */
  get reachedFullRange(): boolean {
    return this.minX <= this.workX;
  }

  /** Time of the turnaround in the rep in progress. */
  get turnaroundT(): number {
    return this.bottomT;
  }

  reset() {
    this.phase = "idle";
  }

  /** Call when pose tracking is lost; an unfinished rep is abandoned after a long gap. */
  lost(t: number) {
    if (this.active && t - this.lastT > 1000) this.phase = "idle";
  }

  process(t: number, value: number): DetectorEvent | null {
    const x = this.sign * value;
    this.lastT = t;

    switch (this.phase) {
      case "idle":
        if (x >= this.restX) {
          this.phase = "rest";
          this.startT = t;
          this.restPeak = x;
        }
        return null;

      case "rest":
        if (x >= this.restX) {
          // Remember the last start-zone sample: it is where the rep "began".
          this.startT = t;
          this.restPeak = Math.max(this.restPeak, x);
          return null;
        }
        this.phase = "out";
        this.maxX = this.restPeak;
        this.minX = x;
        this.bottomT = t;
        return null;

      case "out": {
        if (x > this.maxX) this.maxX = x;
        if (x < this.minX) {
          this.minX = x;
          this.bottomT = t;
        }
        if (t - this.startT > this.config.maxRepMs) {
          this.phase = "idle";
          return null;
        }
        if (x >= this.restX) return this.finish(t, x); // returned without a clear turnaround
        if (x > this.minX + this.config.reversal) this.phase = "back";
        return null;
      }

      case "back": {
        if (t - this.startT > this.config.maxRepMs) {
          this.phase = "idle";
          return null;
        }
        if (x > this.maxX) this.maxX = x;
        if (x >= this.restX) return this.finish(t, x);
        if (x < this.minX) {
          // Went deeper again (bounce / pause-and-go): treat as still on the way out.
          this.minX = x;
          this.bottomT = t;
          this.phase = "out";
        }
        return null;
      }
    }
  }

  private finish(endT: number, x: number): DetectorEvent | null {
    this.phase = "rest";
    const travel = this.maxX - this.minX;
    const totalMs = endT - this.startT;
    this.startT = endT;
    this.restPeak = x;

    if (travel < this.config.minExcursion || totalMs < this.config.minRepMs) return null;

    const startT = endT - totalMs;
    const rep: RepCandidate = {
      startT,
      bottomT: this.bottomT,
      endT,
      extremeValue: this.sign * this.minX,
      startValue: this.sign * this.maxX,
      rangeOfMotion: travel,
      fullRange: this.minX <= this.workX,
      timing: {
        outMs: this.bottomT - startT,
        backMs: endT - this.bottomT,
        totalMs,
      },
    };
    return { type: rep.fullRange ? "rep" : "partial", rep };
  }
}
