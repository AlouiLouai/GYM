import type { CheckConfig, ExerciseConfig, ExerciseGroup, ExerciseId, PoseFrame } from "../engine/types";
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

// Popular gym staples added later. They reuse the same measurable signals (joint angles and torso lean),
// so they get the same caveat: thresholds are coaching conventions to tune with the Debug gauge.

export const benchPress: ExerciseConfig = {
  id: "bench-press",
  name: "Bench press",
  group: "Push",
  view: "side",
  setupHint: "Place the camera side-on at bench height, 2 m away. Arms and torso in frame.",
  signal: angleOf(ELBOW),
  signalLabel: "Elbow angle",
  rep: {
    direction: "decreasing",
    restThreshold: 150,
    workThreshold: 95,
    minExcursion: 25,
    reversal: 8,
    minRepMs: 600,
    maxRepMs: 12000,
  },
  eccentric: "out",
  minEccentricMs: 700,
  cues: {
    partial: "Lower the bar all the way to your chest.",
    tooFast: "Lower the bar under control. Don't bounce it.",
  },
  checks: [],
};

export const gobletSquat: ExerciseConfig = {
  id: "goblet-squat",
  name: "Goblet squat",
  group: "Legs & glutes",
  view: "side",
  setupHint: "Place the camera at hip height, 2–3 m away, side-on. Full body in frame.",
  signal: angleOf(KNEE),
  signalLabel: "Knee angle",
  rep: {
    direction: "decreasing",
    restThreshold: 160,
    workThreshold: 100,
    minExcursion: 20,
    reversal: 8,
    minRepMs: 600,
    maxRepMs: 12000,
  },
  eccentric: "out",
  minEccentricMs: 700,
  cues: {
    partial: "Sit deeper, between your heels.",
    tooFast: "Control the way down.",
  },
  checks: [
    {
      // Holding the weight in front keeps the torso more upright than a back squat.
      id: "torso-lean",
      label: "Leaning too far forward",
      cue: "Keep your chest up.",
      measure: torsoLean,
      stat: "atBottom",
      warnAbove: 45,
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

export const bulgarianSplitSquat: ExerciseConfig = {
  id: "bulgarian-split-squat",
  name: "Bulgarian split squat",
  group: "Legs & glutes",
  view: "side",
  setupHint: "Rear foot on a bench. Place the camera side-on at hip height, 2–3 m away. Full body in frame.",
  signal: angleOf(KNEE),
  signalLabel: "Knee angle (average)",
  rep: {
    direction: "decreasing",
    restThreshold: 155,
    workThreshold: 110,
    minExcursion: 25,
    reversal: 8,
    minRepMs: 700,
    maxRepMs: 12000,
  },
  eccentric: "out",
  minEccentricMs: 700,
  cues: {
    partial: "Drop your back knee lower.",
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

export const hipThrust: ExerciseConfig = {
  id: "hip-thrust",
  name: "Hip thrust",
  group: "Legs & glutes",
  view: "side",
  setupHint: "Upper back on a bench. Place the camera side-on at bench height, 2 m away. Full body in frame.",
  signal: angleOf(HIP),
  signalLabel: "Hip angle",
  rep: {
    direction: "increasing",
    restThreshold: 135,
    workThreshold: 165,
    minExcursion: 25,
    reversal: 8,
    minRepMs: 600,
    maxRepMs: 10000,
  },
  eccentric: "back",
  minEccentricMs: 600,
  cues: {
    partial: "Drive your hips all the way up and squeeze at the top.",
    tooFast: "Lower your hips with control.",
  },
  checks: [],
};

export const frontRaise: ExerciseConfig = {
  id: "front-raise",
  name: "Front raise",
  group: "Shoulders",
  view: "side",
  setupHint: "Place the camera side-on at chest height, 2 m away. Arms and torso in frame.",
  // Shoulder flexion seen side-on: elbow–shoulder–hip is ~10° with arms down and ~90° at shoulder height.
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
    partial: "Raise the weight to shoulder height.",
    tooFast: "Lower the weight slowly.",
  },
  checks: [
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

export const overheadTricepExtension: ExerciseConfig = {
  id: "overhead-tricep-extension",
  name: "Overhead tricep extension",
  group: "Push",
  view: "side",
  setupHint: "Place the camera side-on at head height, 2 m away. Arms and torso in frame.",
  signal: angleOf(ELBOW),
  signalLabel: "Elbow angle",
  rep: {
    // Starts with the weight lowered behind the head (elbow bent) and straightens overhead.
    direction: "increasing",
    restThreshold: 90,
    workThreshold: 150,
    minExcursion: 30,
    reversal: 8,
    minRepMs: 600,
    maxRepMs: 10000,
  },
  eccentric: "back",
  minEccentricMs: 600,
  cues: {
    partial: "Straighten your arms fully overhead.",
    tooFast: "Lower the weight slowly behind your head.",
  },
  checks: [
    {
      id: "tricep-elbows-drop",
      label: "Elbows dropping forward",
      cue: "Keep your elbows pointing up, next to your head.",
      measure: angleOf(UPPER_ARM),
      stat: "min",
      warnBelow: 140,
    },
  ],
};

export const hammerCurl: ExerciseConfig = {
  ...bicepCurl,
  id: "hammer-curl",
  name: "Hammer curl",
  setupHint: "Place the camera side-on at chest height, 2 m away. Arms and torso in frame. Palms facing in.",
};

export const chinUp: ExerciseConfig = {
  ...pullUp,
  id: "chin-up",
  name: "Chin-up",
  setupHint: "Palms facing you. Place the camera side-on at mid-body height, 2–3 m away. Show the full hang to the bar.",
};

export const sitUp: ExerciseConfig = {
  id: "sit-up",
  name: "Sit-up",
  group: "Core & cardio",
  view: "side",
  setupHint: "Lie on your back, knees bent. Place the camera side-on at floor level, 2 m away. Full body in frame.",
  signal: angleOf(HIP),
  signalLabel: "Hip angle",
  rep: {
    direction: "decreasing",
    restThreshold: 120,
    workThreshold: 75,
    minExcursion: 30,
    reversal: 8,
    minRepMs: 600,
    maxRepMs: 10000,
  },
  eccentric: "back",
  minEccentricMs: 600,
  cues: {
    partial: "Sit all the way up, chest toward your knees.",
    tooFast: "Lower yourself slowly. Don't drop back.",
  },
  checks: [],
};

export const hangingLegRaise: ExerciseConfig = {
  id: "hanging-leg-raise",
  name: "Hanging leg raise",
  group: "Core & cardio",
  view: "side",
  setupHint: "Hang from a bar. Place the camera side-on at mid-body height, 2–3 m away. Full body in frame.",
  signal: angleOf(HIP),
  signalLabel: "Hip angle",
  rep: {
    direction: "decreasing",
    restThreshold: 160,
    workThreshold: 105,
    minExcursion: 30,
    reversal: 8,
    minRepMs: 700,
    maxRepMs: 12000,
  },
  eccentric: "back",
  minEccentricMs: 700,
  cues: {
    partial: "Raise your legs to hip height or higher.",
    tooFast: "Lower your legs slowly.",
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

export const jumpingJack: ExerciseConfig = {
  id: "jumping-jack",
  name: "Jumping jack",
  group: "Core & cardio",
  view: "front",
  setupHint: "Face the camera 2–3 m away with your whole body and raised arms in frame.",
  signal: angleOf(UPPER_ARM),
  signalLabel: "Arm raise angle",
  rep: {
    direction: "increasing",
    restThreshold: 40,
    workThreshold: 120,
    minExcursion: 40,
    reversal: 10,
    minRepMs: 300,
    maxRepMs: 5000,
  },
  eccentric: "back",
  // Cardio is meant to be fast: no tempo check.
  minEccentricMs: 0,
  cues: {
    partial: "Bring your arms all the way overhead.",
    tooFast: "Keep the rhythm.",
  },
  checks: [],
};

// Variations of the lifts above. Most reuse a base exercise's movement signal and thresholds and only
// change the name, setup and form checks, so they inherit its tuning (and its caveat).

const torsoLeanCheck = (warnAbove: number, cue = "Keep your chest up."): CheckConfig => ({
  id: "torso-lean",
  label: "Leaning too far forward",
  cue,
  measure: torsoLean,
  stat: "atBottom",
  warnAbove,
});

export const frontSquat: ExerciseConfig = {
  ...squat,
  id: "front-squat",
  name: "Front squat",
  setupHint: "Bar on the front of your shoulders. Place the camera at hip height, side-on, 2–3 m away. Full body in frame.",
  // The bar in front forces an upright torso, so lean is judged more strictly than a back squat.
  checks: [torsoLeanCheck(40, "Keep your elbows high and your chest up."), squat.checks[1]],
};

export const sumoSquat: ExerciseConfig = {
  ...squat,
  id: "sumo-squat",
  name: "Sumo squat",
  setupHint: "Wide stance, toes out. Place the camera at hip height, 2–3 m away, side-on. Full body in frame.",
  checks: [torsoLeanCheck(45), squat.checks[1]],
};

export const reverseLunge: ExerciseConfig = {
  ...lunge,
  id: "reverse-lunge",
  name: "Reverse lunge",
  setupHint: "Step backwards into each rep. Place the camera side-on at hip height, 2–3 m away. Full body in frame.",
};

export const jumpSquat: ExerciseConfig = {
  id: "jump-squat",
  name: "Jump squat",
  group: "Core & cardio",
  view: "side",
  setupHint: "Place the camera at hip height, 3 m away, side-on. Leave room above your head for the jump.",
  signal: angleOf(KNEE),
  signalLabel: "Knee angle",
  rep: {
    direction: "decreasing",
    restThreshold: 155,
    workThreshold: 115,
    minExcursion: 20,
    reversal: 8,
    minRepMs: 400,
    maxRepMs: 6000,
  },
  eccentric: "out",
  // Explosive by design: no tempo check.
  minEccentricMs: 0,
  cues: {
    partial: "Squat a little deeper before you jump.",
    tooFast: "Land softly.",
  },
  checks: [squat.checks[1]],
};

export const goodMorning: ExerciseConfig = {
  ...romanianDeadlift,
  id: "good-morning",
  name: "Good morning",
  group: "Legs & glutes",
  setupHint: "Bar on your upper back. Place the camera at hip height, side-on, 2–3 m away. Full body in frame.",
  cues: {
    partial: "Hinge until your torso is nearly parallel to the floor.",
    tooFast: "Hinge slowly. Push your hips back.",
  },
};

export const sumoDeadlift: ExerciseConfig = {
  ...deadlift,
  id: "sumo-deadlift",
  name: "Sumo deadlift",
  setupHint: "Wide stance. Place the camera at hip height, side-on, 2–3 m away. Full body in frame.",
  // A sumo pull is supposed to bend the knees a lot, so the deadlift's "squatting it" check doesn't apply.
  checks: [],
};

export const kettlebellSwing: ExerciseConfig = {
  id: "kettlebell-swing",
  name: "Kettlebell swing",
  group: "Core & cardio",
  view: "side",
  setupHint: "Place the camera at hip height, side-on, 2–3 m away. Full body and the swing in frame.",
  signal: angleOf(HIP),
  signalLabel: "Hip angle",
  rep: {
    direction: "decreasing",
    restThreshold: 160,
    workThreshold: 115,
    minExcursion: 30,
    reversal: 8,
    minRepMs: 500,
    maxRepMs: 6000,
  },
  eccentric: "out",
  // A swing is ballistic: no tempo check.
  minEccentricMs: 0,
  cues: {
    partial: "Hinge deeper. Hike the bell back between your legs.",
    tooFast: "Let the bell fall, then snap your hips.",
  },
  checks: [
    {
      id: "rdl-knee-bend",
      label: "Bending the knees too much",
      cue: "It's a hinge, not a squat. Push your hips back.",
      measure: angleOf(KNEE),
      stat: "min",
      warnBelow: 120,
    },
  ],
};

export const inclinePushUp: ExerciseConfig = {
  ...pushUp,
  id: "incline-push-up",
  name: "Incline push-up",
  setupHint: "Hands on a bench. Place the camera side-on at bench height, 2 m away. Full body in frame.",
};

export const diamondPushUp: ExerciseConfig = {
  ...pushUp,
  id: "diamond-push-up",
  name: "Diamond push-up",
  setupHint: "Hands together under your chest. Place the camera on the floor, side-on, 2 m away. Full body in frame.",
};

export const pikePushUp: ExerciseConfig = {
  id: "pike-push-up",
  name: "Pike push-up",
  group: "Shoulders",
  view: "side",
  setupHint: "Hips high in an upside-down V. Place the camera on the floor, side-on, 2 m away. Full body in frame.",
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
    partial: "Lower your head closer to the floor.",
    tooFast: "Lower yourself slowly.",
  },
  checks: [],
};

export const benchDip: ExerciseConfig = {
  ...dip,
  id: "bench-dip",
  name: "Bench dip",
  setupHint: "Hands on a bench behind you. Place the camera side-on at bench height, 2 m away. Full body in frame.",
};

export const closeGripBenchPress: ExerciseConfig = {
  ...benchPress,
  id: "close-grip-bench-press",
  name: "Close-grip bench press",
  setupHint: "Hands shoulder-width apart. Place the camera side-on at bench height, 2 m away. Arms and torso in frame.",
};

export const skullCrusher: ExerciseConfig = {
  id: "skull-crusher",
  name: "Skull crusher",
  group: "Push",
  view: "side",
  setupHint: "Lie on a bench. Place the camera side-on at bench height, 2 m away. Arms and torso in frame.",
  signal: angleOf(ELBOW),
  signalLabel: "Elbow angle",
  rep: {
    direction: "decreasing",
    restThreshold: 150,
    workThreshold: 85,
    minExcursion: 30,
    reversal: 8,
    minRepMs: 600,
    maxRepMs: 10000,
  },
  eccentric: "out",
  minEccentricMs: 700,
  cues: {
    partial: "Lower the weight all the way to your forehead.",
    tooFast: "Lower the weight slowly. Protect your head.",
  },
  checks: [],
};

export const arnoldPress: ExerciseConfig = {
  ...shoulderPress,
  id: "arnold-press",
  name: "Arnold press",
  setupHint: "Start with palms facing you. Place the camera side-on at chest height, 2 m away. Full body in frame.",
};

export const uprightRow: ExerciseConfig = {
  id: "upright-row",
  name: "Upright row",
  group: "Shoulders",
  view: "front",
  setupHint: "Face the camera 2–3 m away with your whole upper body in frame.",
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
    partial: "Pull until your elbows reach shoulder height.",
    tooFast: "Lower the weight slowly.",
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

export const invertedRow: ExerciseConfig = {
  id: "inverted-row",
  name: "Inverted row",
  group: "Pull",
  view: "side",
  setupHint: "Hang under a low bar, heels on the floor. Place the camera side-on at bar height, 2–3 m away.",
  signal: angleOf(ELBOW),
  signalLabel: "Elbow angle",
  rep: {
    direction: "decreasing",
    restThreshold: 150,
    workThreshold: 95,
    minExcursion: 30,
    reversal: 8,
    minRepMs: 600,
    maxRepMs: 10000,
  },
  eccentric: "back",
  minEccentricMs: 600,
  cues: {
    partial: "Pull your chest all the way to the bar.",
    tooFast: "Lower yourself under control.",
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

export const oneArmRow: ExerciseConfig = {
  ...bentOverRow,
  id: "one-arm-row",
  name: "One-arm dumbbell row",
  setupHint: "Knee and hand on a bench. Place the camera side-on at hip height, 2 m away, rowing arm facing it.",
};

export const lyingLegRaise: ExerciseConfig = {
  ...hangingLegRaise,
  id: "lying-leg-raise",
  name: "Lying leg raise",
  setupHint: "Lie on your back. Place the camera side-on at floor level, 2 m away. Full body in frame.",
  cues: {
    partial: "Raise your legs until they point at the ceiling.",
    tooFast: "Lower your legs slowly. Don't let them drop.",
  },
  // Lying flat, "swinging" isn't a thing; the torso stays on the floor.
  checks: [],
};

// Timed holds. The rep fields are required by the type but unused: the HoldEngine times these.
const HOLD_REP = {
  direction: "decreasing",
  restThreshold: 170,
  workThreshold: 100,
  minExcursion: 20,
  reversal: 8,
  minRepMs: 600,
  maxRepMs: 12000,
} as const;

const bodyLine = angleOf(BODY_LINE);
const kneeAngle = angleOf(KNEE);

/** Torso near horizontal and the body roughly straight. Lenient: sagging is a fault, not a break. */
function plankPosition(frame: PoseFrame): boolean | null {
  const lean = torsoLean(frame);
  const line = bodyLine(frame);
  if (lean === null || line === null) return null;
  return lean >= 55 && line >= 140;
}

export const plank: ExerciseConfig = {
  id: "plank",
  name: "Plank",
  group: "Holds",
  view: "side",
  setupHint: "Place the camera on the floor, side-on, 2 m away. Full body in frame.",
  signal: bodyLine,
  signalLabel: "Body line",
  rep: HOLD_REP,
  eccentric: "out",
  minEccentricMs: 0,
  cues: { partial: "Get into your plank.", tooFast: "Hold still." },
  checks: [pushUp.checks[0]],
  hold: { inPosition: plankPosition },
};

export const sidePlank: ExerciseConfig = {
  ...plank,
  id: "side-plank",
  name: "Side plank",
  view: "front",
  setupHint: "Face the camera, on one forearm. Camera on the floor, 2 m away. Full body in frame.",
  cues: { partial: "Get into your side plank.", tooFast: "Hold still." },
};

export const wallSit: ExerciseConfig = {
  id: "wall-sit",
  name: "Wall sit",
  group: "Holds",
  view: "side",
  setupHint: "Back flat on a wall. Place the camera at knee height, side-on, 2 m away. Full body in frame.",
  signal: kneeAngle,
  signalLabel: "Knee angle",
  rep: HOLD_REP,
  eccentric: "out",
  minEccentricMs: 0,
  cues: { partial: "Slide down the wall.", tooFast: "Hold still." },
  checks: [
    {
      id: "wall-sit-high",
      label: "Sitting too high",
      cue: "Slide lower. Thighs parallel to the floor.",
      measure: kneeAngle,
      stat: "max",
      warnAbove: 110,
    },
  ],
  hold: {
    inPosition: (frame) => {
      const knee = kneeAngle(frame);
      const lean = torsoLean(frame);
      if (knee === null || lean === null) return null;
      return knee >= 60 && knee <= 130 && lean <= 35;
    },
  },
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
  "bench-press": benchPress,
  "goblet-squat": gobletSquat,
  "bulgarian-split-squat": bulgarianSplitSquat,
  "hip-thrust": hipThrust,
  "front-raise": frontRaise,
  "overhead-tricep-extension": overheadTricepExtension,
  "hammer-curl": hammerCurl,
  "chin-up": chinUp,
  "sit-up": sitUp,
  "hanging-leg-raise": hangingLegRaise,
  "jumping-jack": jumpingJack,
  "front-squat": frontSquat,
  "sumo-squat": sumoSquat,
  "reverse-lunge": reverseLunge,
  "jump-squat": jumpSquat,
  "good-morning": goodMorning,
  "sumo-deadlift": sumoDeadlift,
  "kettlebell-swing": kettlebellSwing,
  "incline-push-up": inclinePushUp,
  "diamond-push-up": diamondPushUp,
  "pike-push-up": pikePushUp,
  "bench-dip": benchDip,
  "close-grip-bench-press": closeGripBenchPress,
  "skull-crusher": skullCrusher,
  "arnold-press": arnoldPress,
  "upright-row": uprightRow,
  "inverted-row": invertedRow,
  "one-arm-row": oneArmRow,
  "lying-leg-raise": lyingLegRaise,
  plank,
  "side-plank": sidePlank,
  "wall-sit": wallSit,
};

export const EXERCISE_LIST: readonly ExerciseConfig[] = Object.values(EXERCISES);

const GROUP_ORDER: readonly ExerciseGroup[] = ["Legs & glutes", "Push", "Pull", "Shoulders", "Core & cardio", "Holds"];

/** Exercises bucketed for the picker, in a stable display order. */
export const EXERCISE_GROUPS: readonly { group: ExerciseGroup; exercises: readonly ExerciseConfig[] }[] =
  GROUP_ORDER.map((group) => ({ group, exercises: EXERCISE_LIST.filter((e) => e.group === group) }));
