import type { SetSummary } from "../engine/set-summary";
import type { ExerciseConfig, Fault, PoseFrame } from "../engine/types";

export type HoldPhase = "waiting" | "holding" | "slipping" | "done";

export type HoldEvent =
  /** In position long enough: the clock starts. */
  | { type: "start" }
  /** Every `MILESTONE_SEC` seconds held. */
  | { type: "milestone"; sec: number }
  /** Left the position; the clock stops if they don't get back within the grace period. */
  | { type: "slipping" }
  | { type: "recovered" }
  | { type: "end"; heldMs: number }
  /** A form fault held long enough to coach. */
  | { type: "live"; fault: Fault };

/** Time in position before the clock starts, so walking past the camera doesn't start a hold. */
const ENTER_MS = 600;
/** Time out of position before the hold is over. Forgiving: a wobble or a dropped landmark isn't failure. */
const GRACE_MS = 2000;
/** A fault must persist this long before it's coached, and each fault is coached at most this often. */
const FAULT_MS = 700;
const FAULT_COOLDOWN_MS = 8000;
export const MILESTONE_SEC = 10;
/** Form score lost per coached fault. */
const FAULT_PENALTY = 10;

/** Times one hold (plank, wall sit) from the pose stream and coaches form faults while holding. */
export class HoldEngine {
  private phase: HoldPhase = "waiting";
  private enterSince: number | null = null;
  private startT = 0;
  private slipSince = 0;
  private endMs = 0;
  private lastMilestone = 0;
  private badSince = new Map<string, number>();
  private lastCued = new Map<string, number>();
  private faultCounts: SetSummary["faultCounts"] = {};

  constructor(private readonly config: ExerciseConfig) {
    if (!config.hold) throw new Error(`${config.id} is not a hold`);
  }

  reset() {
    this.phase = "waiting";
    this.enterSince = null;
    this.lastMilestone = 0;
    this.endMs = 0;
    this.badSince.clear();
    this.lastCued.clear();
    this.faultCounts = {};
  }

  get state(): HoldPhase {
    return this.phase;
  }

  /** Milliseconds held so far (frozen while slipping, final once done). */
  heldMs(t: number): number {
    switch (this.phase) {
      case "waiting":
        return 0;
      case "holding":
        return t - this.startT;
      case "slipping":
        return this.slipSince - this.startT;
      case "done":
        return this.endMs;
    }
  }

  /** `frame` null = nobody detected. */
  process(frame: PoseFrame | null, t: number): HoldEvent[] {
    const inPos = frame ? this.config.hold!.inPosition(frame) === true : false;
    const events: HoldEvent[] = [];
    switch (this.phase) {
      case "waiting":
        if (!inPos) {
          this.enterSince = null;
        } else {
          this.enterSince ??= t;
          if (t - this.enterSince >= ENTER_MS) {
            this.phase = "holding";
            this.startT = this.enterSince;
            events.push({ type: "start" });
          }
        }
        break;
      case "holding":
        if (!inPos) {
          this.phase = "slipping";
          this.slipSince = t;
          events.push({ type: "slipping" });
        }
        break;
      case "slipping":
        if (inPos) {
          this.phase = "holding";
          events.push({ type: "recovered" });
        } else if (t - this.slipSince >= GRACE_MS) {
          this.endMs = this.slipSince - this.startT;
          this.phase = "done";
          events.push({ type: "end", heldMs: this.endMs });
        }
        break;
      case "done":
        break;
    }

    if (this.phase === "holding") {
      const sec = Math.floor((t - this.startT) / 1000);
      if (sec >= this.lastMilestone + MILESTONE_SEC) {
        this.lastMilestone = sec - (sec % MILESTONE_SEC);
        events.push({ type: "milestone", sec: this.lastMilestone });
      }
      if (frame) events.push(...this.checkForm(frame, t));
    }
    return events;
  }

  /** Ends the hold now (the lifter tapped Finish). Returns the time held. */
  finish(t: number): number {
    if (this.phase === "holding" || this.phase === "slipping") {
      this.endMs = this.heldMs(t);
      this.phase = "done";
    }
    return this.heldMs(t);
  }

  summary(heldMs: number): SetSummary {
    const top = Object.entries(this.faultCounts).sort((a, b) => b[1].count - a[1].count)[0];
    const cued = Object.values(this.faultCounts).reduce((a, f) => a + f.count, 0);
    return {
      exercise: this.config.id,
      reps: 0,
      partialReps: 0,
      avgScore: Math.max(0, 100 - cued * FAULT_PENALTY),
      avgRangeOfMotion: 0,
      avgEccentricMs: 0,
      avgConcentricMs: 0,
      bestRep: null,
      worstRep: null,
      faultCounts: structuredClone(this.faultCounts),
      topFault: top ? { id: top[0], label: top[1].label, count: top[1].count } : null,
      fatigue: null,
      holdMs: heldMs,
    };
  }

  private checkForm(frame: PoseFrame, t: number): HoldEvent[] {
    const events: HoldEvent[] = [];
    for (const check of this.config.checks) {
      const value = check.measure(frame);
      const bad =
        value !== null &&
        ((check.warnAbove !== undefined && value > check.warnAbove) ||
          (check.warnBelow !== undefined && value < check.warnBelow));
      if (!bad) {
        this.badSince.delete(check.id);
        continue;
      }
      const since = this.badSince.get(check.id) ?? t;
      this.badSince.set(check.id, since);
      const last = this.lastCued.get(check.id);
      if (t - since >= FAULT_MS && (last === undefined || t - last >= FAULT_COOLDOWN_MS)) {
        this.lastCued.set(check.id, t);
        const entry = (this.faultCounts[check.id] ??= { label: check.label, count: 0 });
        entry.count += 1;
        events.push({
          type: "live",
          fault: { id: check.id, label: check.label, cue: check.cue, value: value ?? undefined },
        });
      }
    }
    return events;
  }
}
