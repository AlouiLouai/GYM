/**
 * Decides what the coach says out loud, so it sounds like a coach and not a nag.
 *
 * The old behaviour spoke every rep number and every fault, every time, so a lifter who
 * leaned forward on 8 reps heard "Keep your chest up" 8 times. The "smart" mode instead:
 * - counts reps (short, what lifters want to hear),
 * - corrects a fault once, then stays quiet about it for FAULT_COOLDOWN_REPS reps,
 * - says "Better!" the first time a coached fault disappears,
 * - counts down near the target ("two more", "last one", "done").
 *
 * Output is language-neutral intents; the UI turns them into words.
 */

export type VoiceMode = "smart" | "all" | "reps" | "chime" | "off";

export const VOICE_MODES: readonly VoiceMode[] = ["smart", "all", "reps", "chime", "off"];

export type VoiceIntent =
  | { type: "count"; n: number }
  | { type: "fault"; id: string }
  | { type: "better" }
  | { type: "twoMore" }
  | { type: "lastOne" }
  | { type: "done" }
  | { type: "beep" }
  | { type: "buzz" };

/** A spoken line: intents joined into one utterance. Faults outrank counts when speech would overlap. */
export interface VoiceLine {
  intents: VoiceIntent[];
  priority: 1 | 2;
}

/** After a fault is said, don't repeat it for this many reps. */
export const FAULT_COOLDOWN_REPS = 3;

export class VoicePolicy {
  private repsDone = 0;
  /** Rep number during which each fault was last spoken. */
  private lastSaid = new Map<string, number>();
  /** Faults that were coached and not yet praised as fixed. */
  private coached = new Set<string>();

  constructor(
    private mode: VoiceMode,
    private target: number | null = null,
  ) {}

  reset(mode = this.mode, target = this.target) {
    this.mode = mode;
    this.target = target;
    this.repsDone = 0;
    this.lastSaid.clear();
    this.coached.clear();
  }

  /** `current` is the rep the fault happened in. */
  private allowFault(id: string, current: number): boolean {
    if (this.mode === "all") return true;
    if (this.mode !== "smart") return false;
    const last = this.lastSaid.get(id);
    return last === undefined || current - last >= FAULT_COOLDOWN_REPS;
  }

  private markSaid(id: string, current: number) {
    this.lastSaid.set(id, current);
    this.coached.add(id);
  }

  /** A fault detected mid-rep. */
  live(id: string): VoiceLine | null {
    if (this.mode === "chime") return { intents: [{ type: "buzz" }], priority: 2 };
    const current = this.repsDone + 1;
    if (!this.allowFault(id, current)) return null;
    this.markSaid(id, current);
    return { intents: [{ type: "fault", id }], priority: 2 };
  }

  /** A rep that didn't reach full range (not counted). */
  partial(announced: boolean): VoiceLine | null {
    if (announced) return null;
    return this.live("depth");
  }

  /**
   * A completed rep. `faults` are all faults of the rep; `unannounced` are those not yet spoken live.
   */
  rep(index: number, faults: readonly string[], unannounced: readonly string[]): VoiceLine | null {
    this.repsDone = index;
    if (this.mode === "off") return null;
    if (this.mode === "chime") {
      return { intents: [{ type: faults.length ? "buzz" : "beep" }], priority: 1 };
    }

    const intents: VoiceIntent[] = [];
    const left = this.target ? this.target - index : null;
    if (left === 0) intents.push({ type: "done" });
    else if (left === 1) intents.push({ type: "count", n: index }, { type: "lastOne" });
    else if (left === 2) intents.push({ type: "count", n: index }, { type: "twoMore" });
    else intents.push({ type: "count", n: index });

    if (left === 0) return { intents, priority: 2 };

    const late = unannounced.find((id) => this.allowFault(id, index));
    if (late) this.markSaid(late, index);

    if (late) {
      intents.push({ type: "fault", id: late });
    } else if (this.mode === "smart" && this.coached.size > 0) {
      const fixed = [...this.coached].find((id) => !faults.includes(id));
      if (fixed && faults.length === 0) {
        this.coached.clear();
        intents.push({ type: "better" });
      }
    }
    return { intents, priority: late ? 2 : 1 };
  }
}
