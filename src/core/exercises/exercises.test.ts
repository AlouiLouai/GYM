import { describe, expect, it } from "vitest";
import { toCoachRequest } from "../coach/request";
import { CoachRequestSchema } from "../coach/schema";
import { ExerciseEngine } from "../engine/exercise-engine";
import { summarizeSet } from "../engine/set-summary";
import { bodyFrame, cycle, hold, type BodyAngles } from "../engine/test-utils";
import type { EngineEvent, ExerciseId } from "../engine/types";
import { EXERCISE_GROUPS, EXERCISE_LIST, EXERCISES } from "./definitions";

describe("exercise configs", () => {
  it("keys match ids and every exercise appears once in the picker", () => {
    for (const [key, config] of Object.entries(EXERCISES)) expect(config.id).toBe(key);
    const grouped = EXERCISE_GROUPS.flatMap((g) => g.exercises.map((e) => e.id));
    expect([...grouped].sort()).toEqual(EXERCISE_LIST.map((e) => e.id).sort());
  });

  it("puts start and target thresholds on the right sides of each other", () => {
    for (const { id, rep } of EXERCISE_LIST) {
      const ordered =
        rep.direction === "decreasing"
          ? rep.restThreshold > rep.workThreshold
          : rep.restThreshold < rep.workThreshold;
      expect(ordered, `${id} thresholds`).toBe(true);
      expect(Math.abs(rep.restThreshold - rep.workThreshold), `${id} reachable`).toBeGreaterThanOrEqual(
        rep.minExcursion,
      );
    }
  });

  it("gives every check a threshold and one label per fault id", () => {
    const labels = new Map<string, string>();
    for (const { id, checks } of EXERCISE_LIST) {
      for (const check of checks) {
        expect(check.warnAbove !== undefined || check.warnBelow !== undefined, `${id}/${check.id}`).toBe(true);
        // Fault ids share one label table (summaries, prompts), so reuse must not change the label.
        expect(labels.get(check.id) ?? check.label, `${check.id} label`).toBe(check.label);
        labels.set(check.id, check.label);
      }
    }
  });

  it("produces a coach request the server schema accepts for every exercise", () => {
    for (const { id } of EXERCISE_LIST) {
      const req = toCoachRequest(summarizeSet(id, []), null);
      expect(CoachRequestSchema.safeParse(req).success, id).toBe(true);
    }
  });
});

type Pose = (depth: number) => BodyAngles;

/** How to drive one exercise's real signal and checks with the synthetic skeleton. */
interface Drive {
  id: ExerciseId;
  /** Which joint angle carries the exercise's movement signal. */
  joint: keyof BodyAngles;
  /** Signal value in the starting position, at full range, and short of full range. */
  start: number;
  deep: number;
  shallow: number;
  /** Posture that must not trip any form check on a clean rep. */
  base?: BodyAngles;
  /** A form fault to inject. `depth` runs 0 at the start to 1 at the target. */
  fault?: { checkId: string; pose: Pose; deep?: number };
}

const DRIVES: Drive[] = [
  {
    id: "lunge",
    joint: "knee",
    start: 175,
    deep: 95,
    shallow: 130,
    fault: { checkId: "torso-lean", pose: (d) => ({ lean: 50 * d }) },
  },
  {
    id: "romanian-deadlift",
    joint: "hip",
    start: 175,
    deep: 85,
    shallow: 135,
    fault: { checkId: "rdl-knee-bend", pose: (d) => ({ knee: 180 - 80 * d }) },
  },
  { id: "glute-bridge", joint: "hip", start: 120, deep: 176, shallow: 150 },
  {
    id: "dip",
    joint: "elbow",
    start: 165,
    deep: 85,
    shallow: 125,
    fault: { checkId: "dip-too-deep", pose: () => ({}), deep: 55 },
  },
  {
    id: "lateral-raise",
    joint: "upperArm",
    start: 10,
    deep: 85,
    shallow: 55,
    fault: { checkId: "body-swing", pose: (d) => ({ lean: 30 * d }) },
  },
  {
    id: "pull-up",
    joint: "elbow",
    start: 170,
    deep: 60,
    shallow: 105,
    fault: { checkId: "kipping", pose: (d) => ({ lean: 40 * d }) },
  },
  {
    id: "bent-over-row",
    joint: "elbow",
    start: 165,
    deep: 85,
    shallow: 125,
    base: { lean: 50 },
    fault: { checkId: "row-standing-up", pose: () => ({ lean: 10 }) },
  },
  { id: "bench-press", joint: "elbow", start: 170, deep: 80, shallow: 125 },
  {
    id: "goblet-squat",
    joint: "knee",
    start: 175,
    deep: 85,
    shallow: 130,
    fault: { checkId: "torso-lean", pose: (d) => ({ lean: 60 * d }) },
  },
  {
    id: "bulgarian-split-squat",
    joint: "knee",
    start: 175,
    deep: 95,
    shallow: 135,
    fault: { checkId: "torso-lean", pose: (d) => ({ lean: 50 * d }) },
  },
  { id: "hip-thrust", joint: "hip", start: 115, deep: 176, shallow: 150 },
  {
    id: "front-raise",
    joint: "upperArm",
    start: 10,
    deep: 85,
    shallow: 55,
    fault: { checkId: "body-swing", pose: (d) => ({ lean: 30 * d }) },
  },
  {
    id: "overhead-tricep-extension",
    joint: "elbow",
    start: 60,
    deep: 170,
    shallow: 120,
    base: { upperArm: 170 },
    fault: { checkId: "tricep-elbows-drop", pose: () => ({ upperArm: 115 }) },
  },
  {
    id: "hammer-curl",
    joint: "elbow",
    start: 170,
    deep: 50,
    shallow: 110,
    fault: { checkId: "body-swing", pose: (d) => ({ lean: 35 * d }) },
  },
  {
    id: "chin-up",
    joint: "elbow",
    start: 170,
    deep: 60,
    shallow: 105,
    fault: { checkId: "kipping", pose: (d) => ({ lean: 40 * d }) },
  },
  { id: "sit-up", joint: "hip", start: 140, deep: 60, shallow: 100 },
  {
    id: "hanging-leg-raise",
    joint: "hip",
    start: 178,
    deep: 90,
    shallow: 135,
    fault: { checkId: "kipping", pose: (d) => ({ lean: 40 * d }) },
  },
  { id: "jumping-jack", joint: "upperArm", start: 10, deep: 150, shallow: 80 },
  {
    id: "front-squat",
    joint: "knee",
    start: 175,
    deep: 90,
    shallow: 130,
    fault: { checkId: "torso-lean", pose: (d) => ({ lean: 50 * d }) },
  },
  {
    id: "sumo-squat",
    joint: "knee",
    start: 175,
    deep: 90,
    shallow: 130,
    fault: { checkId: "torso-lean", pose: (d) => ({ lean: 55 * d }) },
  },
  {
    id: "reverse-lunge",
    joint: "knee",
    start: 175,
    deep: 95,
    shallow: 130,
    fault: { checkId: "torso-lean", pose: (d) => ({ lean: 50 * d }) },
  },
  { id: "jump-squat", joint: "knee", start: 175, deep: 100, shallow: 135 },
  {
    id: "good-morning",
    joint: "hip",
    start: 175,
    deep: 85,
    shallow: 135,
    fault: { checkId: "rdl-knee-bend", pose: (d) => ({ knee: 180 - 80 * d }) },
  },
  { id: "sumo-deadlift", joint: "hip", start: 178, deep: 100, shallow: 140 },
  {
    id: "kettlebell-swing",
    joint: "hip",
    start: 178,
    deep: 100,
    shallow: 135,
    fault: { checkId: "rdl-knee-bend", pose: (d) => ({ knee: 180 - 75 * d }) },
  },
  {
    id: "incline-push-up",
    joint: "elbow",
    start: 170,
    deep: 85,
    shallow: 125,
    fault: { checkId: "body-line", pose: () => ({ hip: 140 }) },
  },
  {
    id: "diamond-push-up",
    joint: "elbow",
    start: 170,
    deep: 85,
    shallow: 125,
    fault: { checkId: "body-line", pose: () => ({ hip: 140 }) },
  },
  { id: "pike-push-up", joint: "elbow", start: 170, deep: 85, shallow: 125 },
  {
    id: "bench-dip",
    joint: "elbow",
    start: 165,
    deep: 85,
    shallow: 125,
    fault: { checkId: "dip-too-deep", pose: () => ({}), deep: 55 },
  },
  { id: "close-grip-bench-press", joint: "elbow", start: 170, deep: 80, shallow: 125 },
  { id: "skull-crusher", joint: "elbow", start: 170, deep: 70, shallow: 120 },
  {
    id: "arnold-press",
    joint: "elbow",
    start: 80,
    deep: 170,
    shallow: 135,
    fault: { checkId: "lean-back", pose: (d) => ({ lean: 25 * d }) },
  },
  {
    id: "upright-row",
    joint: "upperArm",
    start: 10,
    deep: 85,
    shallow: 55,
    fault: { checkId: "body-swing", pose: (d) => ({ lean: 30 * d }) },
  },
  {
    id: "inverted-row",
    joint: "elbow",
    start: 165,
    deep: 85,
    shallow: 125,
    fault: { checkId: "body-line", pose: () => ({ hip: 140 }) },
  },
  {
    id: "one-arm-row",
    joint: "elbow",
    start: 165,
    deep: 85,
    shallow: 125,
    base: { lean: 50 },
    fault: { checkId: "row-standing-up", pose: () => ({ lean: 10 }) },
  },
  { id: "lying-leg-raise", joint: "hip", start: 178, deep: 90, shallow: 135 },
];

/** Plays `reps` slow reps (hold at the start, move to `target` and back) and returns every engine event. */
function play(drive: Drive, target: number, pose: Pose, reps = 1): EngineEvent[] {
  const engine = new ExerciseEngine(EXERCISES[drive.id]);
  const events: EngineEvent[] = [];
  const feed = (t: number, value: number, depth: number) =>
    events.push(...engine.process(bodyFrame(t, { ...drive.base, [drive.joint]: value, ...pose(depth) })).events);

  let t = 0;
  for (const s of hold(drive.start, t, 800)) feed(s.t, s.value, 0);
  t += 800;
  for (let i = 0; i < reps; i++) {
    for (const s of cycle({ from: drive.start, to: target, outMs: 2200, backMs: 2200, startMs: t })) {
      feed(s.t, s.value, (drive.start - s.value) / (drive.start - target));
    }
    t += 4400;
    for (const s of hold(drive.start, t, 600)) feed(s.t, s.value, 0);
    t += 600;
  }
  return events;
}

const noFault: Pose = () => ({});
const repsOf = (events: EngineEvent[]) => events.flatMap((e) => (e.type === "rep" ? [e.rep] : []));

describe.each(DRIVES)("$id (synthetic skeleton)", (drive) => {
  const config = EXERCISES[drive.id];

  it("counts clean reps with no faults and a perfect score", () => {
    const reps = repsOf(play(drive, drive.deep, noFault, 3));
    expect(reps.map((r) => r.index)).toEqual([1, 2, 3]);
    for (const rep of reps) {
      expect(rep.faults).toEqual([]);
      expect(rep.score).toBe(100);
    }
  });

  it("reports a rep that falls short as partial, with this exercise's cue", () => {
    const events = play(drive, drive.shallow, noFault);
    expect(repsOf(events)).toHaveLength(0);
    const partial = events.find((e) => e.type === "partial");
    expect(partial?.type === "partial" && partial.rep.cue).toBe(config.cues.partial);
  });

  it("flags the exercise's own form fault", () => {
    if (!drive.fault) return;
    const { checkId, pose, deep = drive.deep } = drive.fault;
    const [rep] = repsOf(play(drive, deep, pose));
    expect(rep.faults.map((f) => f.id)).toContain(checkId);
    expect(rep.score).toBeLessThan(100);
  });
});
