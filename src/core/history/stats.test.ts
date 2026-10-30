import { describe, expect, it } from "vitest";
import {
  currentStreak,
  estimateOneRepMax,
  fromKg,
  groupByDay,
  newPr,
  personalRecords,
  toKg,
  type SetRecord,
} from "./stats";

let seq = 0;
const set = (over: Partial<SetRecord>): SetRecord => ({
  id: String(++seq),
  at: new Date(2026, 9, 30, 18).getTime(),
  exercise: "squat",
  reps: 5,
  partialReps: 0,
  avgScore: 80,
  weightKg: 100,
  rpe: null,
  topFault: null,
  ...over,
});

describe("units and 1RM", () => {
  it("round-trips kg and lb", () => {
    expect(fromKg(toKg(225, "lb"), "lb")).toBe(225);
    expect(fromKg(100, "lb")).toBe(220.5);
  });

  it("uses Epley, and a single is its own max", () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.67, 1);
  });
});

describe("newPr", () => {
  it("never celebrates the first set of an exercise", () => {
    const first = set({});
    expect(newPr([first], first)).toBeNull();
  });

  it("detects a heavier weight, then a better estimated max at the same weight", () => {
    const old = set({ weightKg: 100, reps: 5 });
    expect(newPr([old], set({ weightKg: 102.5, reps: 3 }))).toBe("weight");
    expect(newPr([old], set({ weightKg: 100, reps: 6 }))).toBe("e1rm");
    expect(newPr([old], set({ weightKg: 100, reps: 5 }))).toBeNull();
  });

  it("uses reps for bodyweight sets", () => {
    const old = set({ exercise: "pull-up", weightKg: null, reps: 8 });
    expect(newPr([old], set({ exercise: "pull-up", weightKg: null, reps: 9 }))).toBe("reps");
  });
});

describe("personalRecords", () => {
  it("summarises per exercise", () => {
    const [squat] = personalRecords([
      set({ weightKg: 100, reps: 5, avgScore: 70 }),
      set({ weightKg: 110, reps: 2, avgScore: 90 }),
    ]);
    expect(squat.bestWeight).toEqual({ kg: 110, reps: 2 });
    expect(squat.bestScore).toBe(90);
    expect(squat.mostReps).toBe(5);
  });
});

describe("streaks and days", () => {
  const day = (d: number) => new Date(2026, 9, d, 18).getTime();
  const now = new Date(2026, 9, 30, 9).getTime();

  it("counts back from yesterday if today has no session yet", () => {
    expect(currentStreak([set({ at: day(29) }), set({ at: day(28) }), set({ at: day(26) })], now)).toBe(2);
  });

  it("is zero when the last session was two days ago", () => {
    expect(currentStreak([set({ at: day(28) })], now)).toBe(0);
  });

  it("groups newest day first", () => {
    const groups = groupByDay([set({ at: day(28) }), set({ at: day(29) }), set({ at: day(29) + 1000 })]);
    expect(groups.map((g) => g.sets.length)).toEqual([2, 1]);
    expect(groups[0].day).toBe("2026-10-29");
  });
});
