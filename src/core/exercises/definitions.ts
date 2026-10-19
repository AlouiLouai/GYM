import type { ExerciseConfig, ExerciseGroup, ExerciseId } from "../engine/types";
import { angleOf, BODY_LINE, ELBOW, HIP, KNEE, kneeToAnkleRatio, torsoLean, UPPER_ARM } from "./measure";

// Thresholds are starting points based on common coaching standards; tune with real footage.

export const squat: ExerciseConfig = {
  id: "squat",
  name: "Squat",
  group: "Legs & glutes",
  view: "side",
  setupHint: "Place the camera at hip height, 2–3 m away, side-on. Full body in frame.",
  signal: angleOf(KNEE),
  signalLabel: "Knee angle",
  rep: {
    direction: "decreasing",
    restThreshold: 160,
    workThreshold: 105,
    minExcursion: 20,
    reversal: 8,
    minRepMs: 600,
    maxRepMs: 12000,
  },
  eccentric: "out",
  minEccentricMs: 700,
  cues: {
    partial: "Go deeper. Aim for thighs parallel to the floor.",
    tooFast: "Control the way down.",
  },
  checks: [
    {
      id: "torso-lean",
      label: "Leaning too far forward",
      cue: "Keep your chest up.",
      measure: torsoLean,
      stat: "atBottom",
      warnAbove: 60,
    },
    {
      id: "knee-cave",
      label: "Knees caving in",
      cue: "Push your knees out over your toes.",
      measure: kneeToAnkleRatio,
      stat: "min",
      warnBelow: 0.85,
    },
  ],
};

export const pushUp: ExerciseConfig = {
  id: "push-up",
  name: "Push-up",
  group: "Push",
  view: "side",
  setupHint: "Place the camera on the floor, side-on, 2 m away. Full body in frame.",
  signal: angleOf(ELBOW),
  signalLabel: "Elbow angle",
  rep: {
    direction: "decreasing",
    restThreshold: 150,
    workThreshold: 100,
    minExcursion: 20,
    reversal: 8,
    minRepMs: 500,
    maxRepMs: 10000,
  },
  eccentric: "out",
  minEccentricMs: 600,
  cues: {
    partial: "Lower your chest closer to the floor.",
    tooFast: "Slow down on the way down.",
  },
  checks: [
    {
      id: "body-line",
      label: "Hips out of line",
      cue: "Keep your body in a straight line.",
      measure: angleOf(BODY_LINE),
      stat: "min",
      warnBelow: 155,
    },
  ],
};

export const deadlift: ExerciseConfig = {
  id: "deadlift",
  name: "Deadlift",
  group: "Legs & glutes",
  view: "side",
  setupHint: "Place the camera at hip height, side-on, 2–3 m away. Full body in frame.",
  signal: angleOf(HIP),
  signalLabel: "Hip angle",
  rep: {
    direction: "decreasing",
    // Reps start and end at lockout, so a rep only completes once the hips are fully extended.
    restThreshold: 165,
    workThreshold: 115,
    minExcursion: 25,
    reversal: 8,
    minRepMs: 800,
    maxRepMs: 12000,
  },
  eccentric: "out",
  minEccentricMs: 700,
  cues: {
    partial: "Hinge lower until the bar reaches the floor or your shins.",
    tooFast: "Lower the bar under control.",
  },
  checks: [
    {
      id: "squatting-it",
      label: "Bending the knees too much",
      cue: "Hinge at the hips. Keep your shins more vertical.",
      measure: angleOf(KNEE),
      stat: "min",
      warnBelow: 105,
    },
  ],
};

export const shoulderPress: ExerciseConfig = {
  id: "shoulder-press",
  name: "Shoulder press",
  group: "Shoulders",
  view: "side",
  setupHint: "Place the camera side-on at chest height, 2 m away. Full body in frame.",
  signal: angleOf(ELBOW),
  signalLabel: "Elbow angle",
  rep: {
    direction: "increasing",
    restThreshold: 105,
    workThreshold: 160,
    minExcursion: 25,
    reversal: 8,
    minRepMs: 600,
    maxRepMs: 12000,
  },
  eccentric: "back",
  minEccentricMs: 600,
  cues: {
    partial: "Press all the way up until your arms are straight.",
    tooFast: "Lower the weight with control.",
  },
  checks: [
    {
      id: "lean-back",
      label: "Leaning back",
      cue: "Brace your core. Don't lean back.",
      measure: torsoLean,
      stat: "max",
      warnAbove: 15,
    },
  ],
};

export const bicepCurl: ExerciseConfig = {
  id: "bicep-curl",
  name: "Bicep curl",
  group: "Pull",
  view: "side",
  setupHint: "Place the camera side-on at chest height, 2 m away. Arms and torso in frame.",
  signal: angleOf(ELBOW),
  signalLabel: "Elbow angle",
  rep: {
    direction: "decreasing",
    restThreshold: 150,
    workThreshold: 75,
    minExcursion: 25,
    reversal: 8,
    minRepMs: 600,
    maxRepMs: 10000,
  },
  eccentric: "back",
  minEccentricMs: 600,
  cues: {
    partial: "Curl all the way up.",
    tooFast: "Lower the weight slowly.",
  },
  checks: [
    {
      id: "elbow-drift",
      label: "Elbows drifting forward",
      cue: "Keep your elbows pinned to your sides.",
      measure: angleOf(UPPER_ARM),
      stat: "max",
      warnAbove: 35,
    },
    {
      id: "body-swing",
      label: "Swinging the torso",
      cue: "Stay upright. Don't swing the weight up.",
      measure: torsoLean,
      stat: "max",
      warnAbove: 20,
    },
  ],
};

// Exercises added after the first five. Same engine, same caveat: thresholds are coaching
// conventions, not validated against labelled footage. Use the Debug gauge to tune them.

export const lunge: ExerciseConfig = {
  id: "lunge",
  name: "Lunge",
  group: "Legs & glutes",
  view: "side",
  setupHint: "Place the camera side-on at hip height, 2–3 m away. Full body in frame.",
  // Both knees bend in a lunge; the side-weighted average of the two tracks the whole movement.
  signal: angleOf(KNEE),
  signalLabel: "Knee angle (average)",
  rep: {
    direction: "decreasing",
    restThreshold: 160,
    workThreshold: 110,
    minExcursion: 30,
    reversal: 8,
    minRepMs: 700,
    maxRepMs: 12000,
  },
  eccentric: "out",
  minEccentricMs: 600,
  cues: {
    partial: "Sink lower. Aim for both knees near 90 degrees.",
    tooFast: "Control the way down.",
  },
  checks: [
    {
      id: "torso-lean",
      label: "Leaning too far forward",
      cue: "Keep your torso tall.",
      measure: torsoLean,
      stat: "atBottom",
      warnAbove: 35,
    },
  ],
};

export const romanianDeadlift: ExerciseConfig = {
  id: "romanian-deadlift",
  name: "Romanian deadlift",
  group: "Legs & glutes",
  view: "side",
  setupHint: "Place the camera at hip height, side-on, 2–3 m away. Full body in frame.",
  signal: angleOf(HIP),
  signalLabel: "Hip angle",
  rep: {
    direction: "decreasing",
    restThreshold: 165,
    // A deeper hinge than a floor deadlift: the bar travels to mid-shin, not the floor.
    workThreshold: 105,
    minExcursion: 35,
    reversal: 8,
    minRepMs: 1000,
    maxRepMs: 14000,
  },
  eccentric: "out",
  minEccentricMs: 900,
  cues: {
    partial: "Hinge lower until you feel a stretch in your hamstrings.",
    tooFast: "Lower the bar slowly. Push your hips back.",
  },
  checks: [
    {
      id: "rdl-knee-bend",
      label: "Bending the knees too much",
      cue: "Keep only a soft bend in the knees. Push your hips back instead.",
      measure: angleOf(KNEE),
      stat: "min",
      warnBelow: 120,
    },
  ],
};

export const gluteBridge: ExerciseConfig = {
  id: "glute-bridge",
  name: "Glute bridge",
  group: "Legs & glutes",
  view: "side",
  setupHint: "Lie on your back with the camera side-on at floor level, 2 m away. Full body in frame.",
  signal: angleOf(HIP),
  signalLabel: "Hip angle",
  rep: {
    // Starts with the hips on the floor (small angle) and opens toward a straight line.
    direction: "increasing",
    restThreshold: 140,
    workThreshold: 165,
    minExcursion: 25,
    reversal: 8,
    minRepMs: 600,
    maxRepMs: 10000,
  },
  eccentric: "back",
  minEccentricMs: 600,
  cues: {
    partial: "Drive your hips higher until your body forms a straight line.",
    tooFast: "Lower your hips with control.",
  },
  checks: [],
};

export const dip: ExerciseConfig = {
  id: "dip",
  name: "Dip",
  group: "Push",
  view: "side",
  setupHint: "Place the camera side-on at chest height, 2 m away. Full body in frame.",
  signal: angleOf(ELBOW),
  signalLabel: "Elbow angle",
  rep: {
    direction: "decreasing",
    restThreshold: 150,
    workThreshold: 100,
    minExcursion: 30,
    reversal: 8,
    minRepMs: 600,
    maxRepMs: 10000,
  },
  eccentric: "out",
  minEccentricMs: 700,
  cues: {
    partial: "Lower until your upper arms are parallel to the floor.",
    tooFast: "Lower yourself slowly.",
  },
  checks: [
    {
      id: "dip-too-deep",
      label: "Going too deep",
      cue: "Stop when your upper arms are parallel to the floor. Protect your shoulders.",
      measure: angleOf(ELBOW),
      stat: "min",
      warnBelow: 70,
    },
  ],
};

export const lateralRaise: ExerciseConfig = {
  id: "lateral-raise",
  name: "Lateral raise",
  group: "Shoulders",
  view: "front",
  setupHint: "Face the camera 2–3 m away with your whole upper body in frame.",
  // Shoulder abduction: elbow–shoulder–hip is ~10° with the arms down and ~90° at shoulder height.
  signal: angleOf(UPPER_ARM),
  signalLabel: "Arm raise angle",
  rep: {
    direction: "increasing",
    restThreshold: 35,
    workThreshold: 75,
    minExcursion: 30,
    reversal: 8,
    minRepMs: 600,
    maxRepMs: 10000,
  },
  eccentric: "back",
  minEccentricMs: 700,
  cues: {
    partial: "Raise your arms to shoulder height.",
    tooFast: "Lower the weights slowly.",
  },
  checks: [
    {
      id: "raise-too-high",
      label: "Raising above shoulder height",
      cue: "Stop at shoulder height.",
      measure: angleOf(UPPER_ARM),
      stat: "max",
      warnAbove: 115,
    },
    {
      id: "body-swing",
      label: "Swinging the torso",
      cue: "Stay upright. Don't swing the weight up.",
      measure: torsoLean,
      stat: "max",
      warnAbove: 15,
    },
  ],
};

export const pullUp: ExerciseConfig = {
  id: "pull-up",
  name: "Pull-up",
  group: "Pull",
  view: "side",
  setupHint: "Place the camera side-on at mid-body height, 2–3 m away. Show the full hang to the bar.",
  signal: angleOf(ELBOW),
  signalLabel: "Elbow angle",
  rep: {
    direction: "decreasing",
    // Reps start and end in a dead hang, so a rep only completes once the arms are nearly straight.
    restThreshold: 150,
    workThreshold: 75,
    minExcursion: 40,
    reversal: 10,
    minRepMs: 800,
    maxRepMs: 12000,
  },
  eccentric: "back",
  minEccentricMs: 800,
  cues: {
    partial: "Pull higher until your chin clears the bar.",
    tooFast: "Lower yourself under control.",
  },
  checks: [
    {
      id: "kipping",
      label: "Swinging or kipping",
      cue: "Keep your body still. Don't swing.",
      measure: torsoLean,
      stat: "max",
      warnAbove: 25,
    },
  ],
};

export const bentOverRow: ExerciseConfig = {
  id: "bent-over-row",
  name: "Bent-over row",
  group: "Pull",
  view: "side",
  setupHint: "Place the camera side-on at hip height, 2–3 m away. Full body in frame.",
  signal: angleOf(ELBOW),
  signalLabel: "Elbow angle",
  rep: {
    direction: "decreasing",
    restThreshold: 150,
    workThreshold: 100,
    minExcursion: 30,
    reversal: 8,
    minRepMs: 600,
    maxRepMs: 10000,
  },
  eccentric: "back",
  minEccentricMs: 600,
  cues: {
    partial: "Pull the weight up to your ribs.",
    tooFast: "Lower the weight with control.",
  },
  checks: [
    {
      id: "row-standing-up",
      label: "Standing up out of the hinge",
      cue: "Stay hinged forward. Don't stand up to lift the weight.",
      measure: torsoLean,
      stat: "min",
      warnBelow: 25,
    },
  ],
};

export const EXERCISES: Record<ExerciseId, ExerciseConfig> = {
  squat,
  lunge,
  deadlift,
  "romanian-deadlift": romanianDeadlift,
  "glute-bridge": gluteBridge,
  "push-up": pushUp,
  dip,
  "shoulder-press": shoulderPress,
  "lateral-raise": lateralRaise,
  "pull-up": pullUp,
  "bent-over-row": bentOverRow,
  "bicep-curl": bicepCurl,
};

export const EXERCISE_LIST: readonly ExerciseConfig[] = Object.values(EXERCISES);

const GROUP_ORDER: readonly ExerciseGroup[] = ["Legs & glutes", "Push", "Pull", "Shoulders"];

/** Exercises bucketed for the picker, in a stable display order. */
export const EXERCISE_GROUPS: readonly { group: ExerciseGroup; exercises: readonly ExerciseConfig[] }[] =
  GROUP_ORDER.map((group) => ({ group, exercises: EXERCISE_LIST.filter((e) => e.group === group) }));
