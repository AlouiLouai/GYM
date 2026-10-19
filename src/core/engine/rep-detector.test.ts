import { describe, expect, it } from "vitest";
import { RepDetector } from "./rep-detector";
import { cycle, hold, noise } from "./test-utils";
import type { DetectorEvent, RepDetectorConfig } from "./types";

const squat: RepDetectorConfig = {
  direction: "decreasing",
  restThreshold: 160,
  workThreshold: 105,
  minExcursion: 20,
  reversal: 8,
  minRepMs: 600,
  maxRepMs: 12000,
};

const press: RepDetectorConfig = {
  direction: "increasing",
  restThreshold: 105,
  workThreshold: 160,
  minExcursion: 25,
  reversal: 8,
  minRepMs: 600,
  maxRepMs: 12000,
};

function run(config: RepDetectorConfig, samples: { t: number; value: number }[]) {
  const detector = new RepDetector(config);
  const events: DetectorEvent[] = [];
  for (const s of samples) {
    const e = detector.process(s.t, s.value);
    if (e) events.push(e);
  }
  return events;
}

/** `n` reps separated by short rests, each going `from` → `to` → `from`. */
function reps(n: number, from: number, to: number, outMs = 1500, backMs = 1000) {
  const samples = hold(from, 0, 500);
  let t = 500;
  for (let i = 0; i < n; i++) {
    samples.push(...cycle({ from, to, outMs, backMs, startMs: t }));
    t += outMs + backMs;
    samples.push(...hold(from, t, 400));
    t += 400;
  }
  return samples;
}

describe("RepDetector (decreasing signal, e.g. knee angle)", () => {
  it("counts clean full-range reps", () => {
    const events = run(squat, reps(5, 175, 85));
    expect(events.map((e) => e.type)).toEqual(Array(5).fill("rep"));
  });

  it("measures range of motion, depth and timing", () => {
    const [event] = run(squat, reps(1, 175, 85, 1500, 1000));
    expect(event.rep.rangeOfMotion).toBeCloseTo(90, 0);
    expect(event.rep.extremeValue).toBeCloseTo(85, 0);
    // Timing runs between crossings of the start threshold (160°), so the slow first and last
    // few degrees of a 1500 ms / 1000 ms cycle are excluded: expect ≈1100 ms out, ≈730 ms back.
    expect(event.rep.timing.outMs).toBeGreaterThan(950);
    expect(event.rep.timing.outMs).toBeLessThan(1250);
    expect(event.rep.timing.backMs).toBeGreaterThan(600);
    expect(event.rep.timing.backMs).toBeLessThan(850);
  });

  it("reports reps that don't reach full depth as partial", () => {
    const events = run(squat, reps(2, 175, 125));
    expect(events.map((e) => e.type)).toEqual(["partial", "partial"]);
  });

  it("separates full and partial reps in the same set", () => {
    const samples = [...reps(2, 175, 85), ...reps(1, 175, 125).map((s) => ({ ...s, t: s.t + 20000 }))];
    const events = run(squat, samples);
    expect(events.map((e) => e.type)).toEqual(["rep", "rep", "partial"]);
  });

  it("ignores sensor jitter around the start position", () => {
    const samples = hold(170, 0, 6000).map((s, i) => ({ ...s, value: 170 + noise(i, 6) }));
    expect(run(squat, samples)).toEqual([]);
  });

  it("still counts reps through realistic noise", () => {
    const noisy = reps(5, 175, 85).map((s, i) => ({ ...s, value: s.value + noise(i, 4) }));
    const events = run(squat, noisy);
    expect(events.filter((e) => e.type === "rep")).toHaveLength(5);
  });

  it("does not count a rep until the lifter has been seen at the start position", () => {
    // Recording begins mid-squat: the first descent must not produce a bogus rep.
    const midMovement = cycle({ from: 175, to: 85, outMs: 1500, backMs: 1000, startMs: 0 }).slice(25);
    expect(run(squat, midMovement)).toEqual([]);
  });

  it("handles a pause at the bottom without double counting", () => {
    const samples = [
      ...hold(175, 0, 500),
      ...cycle({ from: 175, to: 85, outMs: 1200, backMs: 0, startMs: 500 }),
      ...hold(85, 1700, 1500),
      ...cycle({ from: 85, to: 175, outMs: 1000, backMs: 0, startMs: 3200 }),
      ...hold(175, 4200, 500),
    ];
    expect(run(squat, samples).map((e) => e.type)).toEqual(["rep"]);
  });

  it("abandons a rep that takes far too long", () => {
    const events = run(squat, reps(1, 175, 85, 20000, 1000));
    expect(events).toEqual([]);
  });

  it("abandons an unfinished rep after tracking is lost, so the next one isn't merged", () => {
    const detector = new RepDetector(squat);
    for (const s of hold(175, 0, 500)) detector.process(s.t, s.value);
    for (const s of cycle({ from: 175, to: 90, outMs: 1500, backMs: 1000, startMs: 500 }).slice(0, 30)) {
      detector.process(s.t, s.value);
    }
    expect(detector.active).toBe(true);
    detector.lost(5000);
    expect(detector.active).toBe(false);
  });
});

describe("RepDetector (increasing signal, e.g. overhead press elbow angle)", () => {
  it("counts presses from the shoulders to lockout", () => {
    const events = run(press, reps(4, 80, 175));
    expect(events.map((e) => e.type)).toEqual(Array(4).fill("rep"));
  });

  it("flags a press that doesn't reach lockout as partial", () => {
    const events = run(press, reps(1, 80, 140));
    expect(events.map((e) => e.type)).toEqual(["partial"]);
  });

  it("reports the extreme in raw signal units", () => {
    const [event] = run(press, reps(1, 80, 175));
    expect(event.rep.extremeValue).toBeCloseTo(175, 0);
    expect(event.rep.rangeOfMotion).toBeCloseTo(95, 0);
  });
});
