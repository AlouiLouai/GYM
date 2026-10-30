import type { Landmark } from "../pose/landmarks";

/** One frame of pose data. `world` (metres, hip-centred) is preferred when available. */
export interface PoseFrame {
  /** Monotonic timestamp in milliseconds. */
  t: number;
  /** Normalised image landmarks (0–1). */
  image: readonly Landmark[];
  /** 3D world landmarks in metres. View-independent, so best for angles. */
  world?: readonly Landmark[];
  /** Video width / height; used to un-squash image-space angles when `world` is missing. */
  aspect?: number;
}

export type ExerciseId =
  | "squat"
  | "lunge"
  | "deadlift"
  | "romanian-deadlift"
  | "glute-bridge"
  | "push-up"
  | "dip"
  | "shoulder-press"
  | "lateral-raise"
  | "pull-up"
  | "bent-over-row"
  | "bicep-curl"
  | "bench-press"
  | "goblet-squat"
  | "bulgarian-split-squat"
  | "hip-thrust"
  | "front-raise"
  | "overhead-tricep-extension"
  | "hammer-curl"
  | "chin-up"
  | "sit-up"
  | "hanging-leg-raise"
  | "jumping-jack"
  | "front-squat"
  | "sumo-squat"
  | "reverse-lunge"
  | "jump-squat"
  | "good-morning"
  | "sumo-deadlift"
  | "kettlebell-swing"
  | "incline-push-up"
  | "diamond-push-up"
  | "pike-push-up"
  | "bench-dip"
  | "close-grip-bench-press"
  | "skull-crusher"
  | "arnold-press"
  | "upright-row"
  | "inverted-row"
  | "one-arm-row"
  | "lying-leg-raise"
  | "plank"
  | "side-plank"
  | "wall-sit";

/** How exercises are grouped in the picker. */
export type ExerciseGroup = "Legs & glutes" | "Push" | "Pull" | "Shoulders" | "Core & cardio" | "Holds";

/** Which part of the movement is the lowering (eccentric) phase. */
export type EccentricPhase = "out" | "back";

export interface RepDetectorConfig {
  /**
   * Direction the primary signal moves when leaving the starting position.
   * Squat/push-up/deadlift/curl: "decreasing" (angle closes). Overhead press: "increasing".
   */
  direction: "decreasing" | "increasing";
  /** Signal value at (or beyond, toward the start side of) which the lifter is in the starting position. */
  restThreshold: number;
  /** Signal value that must be reached for a rep to count as full range. */
  workThreshold: number;
  /** Minimum travel away from the start before a movement counts as a rep attempt. */
  minExcursion: number;
  /** Counter-movement needed from the extreme to register the turnaround. */
  reversal: number;
  minRepMs: number;
  maxRepMs: number;
}

/**
 * Timing is measured between crossings of `restThreshold`, not from the first twitch of movement,
 * so it is repeatable across reps but shorter than the "felt" duration. Tune `minEccentricMs` accordingly.
 */
export interface RepTiming {
  /** Time from leaving the start zone to the turnaround. */
  outMs: number;
  /** Time from the turnaround back into the start zone. */
  backMs: number;
  totalMs: number;
}

export interface RepCandidate {
  startT: number;
  bottomT: number;
  endT: number;
  /** Signal value at the turnaround (raw units, e.g. minimum knee angle). */
  extremeValue: number;
  /** Signal value at the start of the rep (raw units). */
  startValue: number;
  /** Total travel of the signal in the rep, in raw units. */
  rangeOfMotion: number;
  /** Whether the full-range threshold was reached. */
  fullRange: boolean;
  timing: RepTiming;
}

export type DetectorEvent = { type: "rep"; rep: RepCandidate } | { type: "partial"; rep: RepCandidate };

export type DetectorPhase = "idle" | "rest" | "out" | "back";

/** A form check evaluated over the course of a rep. */
export interface CheckConfig {
  id: string;
  /** Short name of the fault, e.g. "Knees caving in". */
  label: string;
  /** What to tell the lifter. */
  cue: string;
  /** Per-frame measurement; return null when it can't be measured reliably. */
  measure: (frame: PoseFrame) => number | null;
  /** Which value from the rep is judged. */
  stat: "max" | "min" | "atBottom";
  warnAbove?: number;
  warnBelow?: number;
  /** Score points lost when this check fails. */
  penalty?: number;
}

export interface ExerciseConfig {
  id: ExerciseId;
  name: string;
  group: ExerciseGroup;
  /** Where to put the camera. */
  view: "side" | "front";
  setupHint: string;
  /** Primary movement signal (usually a joint angle in degrees). */
  signal: (frame: PoseFrame) => number | null;
  /** Human name of `signal`, for the debug gauge (e.g. "Knee angle"). */
  signalLabel: string;
  rep: RepDetectorConfig;
  eccentric: EccentricPhase;
  /** Minimum controlled lowering time. */
  minEccentricMs: number;
  cues: {
    /** Said after a rep that did not reach full range. */
    partial: string;
    /** Said after a rep whose lowering was too fast. */
    tooFast: string;
  };
  checks: readonly CheckConfig[];
  /**
   * Set for timed holds (plank, wall sit). They are timed by the HoldEngine instead of counted by the
   * rep engine; `checks` are then judged frame by frame while holding.
   */
  hold?: {
    /** Whether the lifter is in the hold position; null when it can't be measured. */
    inPosition: (frame: PoseFrame) => boolean | null;
  };
}

export interface Fault {
  id: string;
  label: string;
  cue: string;
  /** Measured value that triggered the fault (undefined for depth/tempo). */
  value?: number;
  /** True if this fault was already spoken/shown live, mid-rep. */
  announced?: boolean;
}

export interface RepResult {
  index: number;
  exercise: ExerciseId;
  startT: number;
  endT: number;
  rangeOfMotion: number;
  extremeValue: number;
  eccentricMs: number;
  concentricMs: number;
  totalMs: number;
  faults: Fault[];
  /** 0–100 form score. */
  score: number;
}

export interface PartialRepResult {
  exercise: ExerciseId;
  startT: number;
  endT: number;
  rangeOfMotion: number;
  extremeValue: number;
  cue: string;
  /** True if the depth cue was already given live at the turnaround. */
  announced: boolean;
}

export type EngineEvent =
  /** A fault detected while the rep is still in progress, so it can be coached immediately. */
  | { type: "live"; exercise: ExerciseId; fault: Fault }
  | { type: "rep"; rep: RepResult }
  | { type: "partial"; rep: PartialRepResult };
