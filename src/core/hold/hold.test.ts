import { describe, expect, it } from "vitest";
import { bodyFrame, type BodyAngles } from "../engine/test-utils";
import type { ExerciseId } from "../engine/types";
import { ghostFor } from "../exercises/ghost";
import { EXERCISE_LIST, EXERCISES } from "../exercises/definitions";
import { platesFor } from "../history/plates";
import { newPr, personalRecords, weeklyStats, type SetRecord } from "../history/stats";
import { HoldEngine, type HoldEvent } from "./hold-engine";

const PLANK: BodyAngles = { lean: 90, upperArm: 90 };
const SAG: BodyAngles = { lean: 90, upperArm: 90, hip: 150 };
const STANDING: BodyAngles = {};
const WALL_SIT: BodyAngles = { hip: 90, knee: 90 };

/** Feeds `ms` of a still pose at 30 fps starting at `from`; returns the events. */
function feed(engine: HoldEngine, pose: BodyAngles | null, from: number, ms: number): HoldEvent[] {
  const events: HoldEvent[] = [];
  for (let t = from; t < from + ms; t += 33) events.push(...engine.process(pose ? bodyFrame(t, pose) : null, t));
  return events;
}
const types = (events: HoldEvent[]) => events.map((e) => e.type);

describe("HoldEngine", () => {
  it("times a plank from entering the position until the lifter drops out", () => {
    const engine = new HoldEngine(EXERCISES.plank);
    expect(types(feed(engine, STANDING, 0, 1000))).toEqual([]);
    const holding = feed(engine, PLANK, 1000, 25_000);
    expect(holding[0].type).toBe("start");
    expect(holding.filter((e) => e.type === "milestone").map((e) => e.type === "milestone" && e.sec)).toEqual([10, 20]);
    const end = feed(engine, STANDING, 26_000, 3000);
    expect(types(end)).toEqual(["slipping", "end"]);
    const done = end.at(-1);
    expect(done?.type === "end" && Math.round(done.heldMs / 1000)).toBe(25);
    expect(engine.state).toBe("done");
  });

  it("forgives a short wobble or a lost frame", () => {
    const engine = new HoldEngine(EXERCISES.plank);
    feed(engine, PLANK, 0, 5000);
    expect(types(feed(engine, null, 5000, 800))).toEqual(["slipping"]);
    expect(types(feed(engine, PLANK, 5800, 3000))).toEqual(["recovered"]);
    expect(engine.state).toBe("holding");
    expect(engine.heldMs(8800)).toBeGreaterThan(8000);
  });

  it("does not start for someone just passing through", () => {
    const engine = new HoldEngine(EXERCISES.plank);
    feed(engine, PLANK, 0, 300);
    feed(engine, STANDING, 300, 300);
    feed(engine, PLANK, 600, 300);
    expect(engine.state).toBe("waiting");
  });

  it("coaches sagging hips, with a cooldown, and scores it", () => {
    const engine = new HoldEngine(EXERCISES.plank);
    feed(engine, PLANK, 0, 2000);
    const live = feed(engine, SAG, 2000, 10_000).filter((e) => e.type === "live");
    expect(live.map((e) => e.type === "live" && e.fault.id)).toEqual(["body-line", "body-line"]);
    const summary = engine.summary(engine.finish(12_000));
    expect(summary.topFault?.id).toBe("body-line");
    expect(summary.avgScore).toBe(80);
    expect(Math.round(summary.holdMs! / 1000)).toBe(12);
  });

  it("times a wall sit and flags sitting too high", () => {
    const engine = new HoldEngine(EXERCISES["wall-sit"]);
    expect(feed(engine, WALL_SIT, 0, 2000)[0].type).toBe("start");
    const high = feed(engine, { hip: 120, knee: 120 }, 2000, 2000);
    expect(high.some((e) => e.type === "live" && e.fault.id === "wall-sit-high")).toBe(true);
  });

  it("refuses rep exercises", () => {
    expect(() => new HoldEngine(EXERCISES.squat)).toThrow();
  });
});

describe("platesFor", () => {
  it("loads the fewest plates per side", () => {
    expect(platesFor(100, 20, "kg")).toEqual({ perSide: [25, 15], loaded: 100, exact: true });
    expect(platesFor(62.5, 20, "kg")?.perSide).toEqual([20, 1.25]);
    expect(platesFor(225, 45, "lb")?.perSide).toEqual([45, 45]);
  });
  it("handles the empty bar, too-light totals and unloadable ones", () => {
    expect(platesFor(20, 20, "kg")).toEqual({ perSide: [], loaded: 20, exact: true });
    expect(platesFor(15, 20, "kg")).toBeNull();
    expect(platesFor(101, 20, "kg")).toMatchObject({ loaded: 100, exact: false });
  });
});

const set = (over: Partial<SetRecord>): SetRecord => ({
  id: Math.random().toString(36),
  at: 0,
  exercise: "plank",
  reps: 0,
  partialReps: 0,
  avgScore: 100,
  weightKg: null,
  rpe: null,
  topFault: null,
  ...over,
});

describe("hold records", () => {
  it("celebrates a longer hold, not the first one", () => {
    const first = set({ holdSec: 30 });
    expect(newPr([], first)).toBeNull();
    expect(newPr([first], set({ holdSec: 45 }))).toBe("hold");
    expect(newPr([first], set({ holdSec: 30 }))).toBeNull();
    expect(personalRecords([first, set({ holdSec: 45 })])[0].longestHoldSec).toBe(45);
  });
});

describe("weeklyStats", () => {
  it("buckets by Monday-start week, oldest first, with empty weeks", () => {
    const now = new Date(2026, 9, 30, 12).getTime(); // Friday
    const monday = new Date(2026, 9, 26, 9).getTime();
    const lastSunday = new Date(2026, 9, 25, 20).getTime();
    const weeks = weeklyStats(
      [
        set({ at: monday, exercise: "squat", reps: 5, weightKg: 100 }),
        set({ at: now, holdSec: 60 }),
        set({ at: lastSunday, exercise: "squat", reps: 8 }),
        set({ at: new Date(2025, 0, 1).getTime() }),
      ],
      4,
      now,
    );
    expect(weeks.map((w) => w.week)).toEqual(["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
    expect(weeks[3]).toEqual({ week: "2026-10-26", sets: 2, reps: 5, volumeKg: 500, holdSec: 60 });
    expect(weeks[2].sets).toBe(1);
    expect(weeks[0].sets).toBe(0);
  });
});

describe("ghostFor", () => {
  it("fits every exercise's outline inside the frame", () => {
    for (const { id } of EXERCISE_LIST) {
      const { bones, head } = ghostFor(id);
      for (const v of [...bones.flat().flat(), ...head.center]) {
        expect(v, id).toBeGreaterThanOrEqual(0.05);
        expect(v, id).toBeLessThanOrEqual(0.95);
      }
    }
  });
  it("puts plank arms down to the floor and bench arms up to the bar", () => {
    // bones[3] = shoulder→elbow; image y grows downward.
    const armDrop = (id: ExerciseId) => {
      const [shoulder, elbow] = ghostFor(id).bones[3];
      return elbow[1] - shoulder[1];
    };
    expect(armDrop("push-up")).toBeGreaterThan(0.05);
    expect(armDrop("bench-press")).toBeLessThan(-0.05);
  });
});
