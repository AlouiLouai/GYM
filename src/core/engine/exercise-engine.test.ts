import { describe, expect, it } from "vitest";
import { squat } from "../exercises/definitions";
import { ExerciseEngine } from "./exercise-engine";
import { compareSets, summarizeSet } from "./set-summary";
import { cycle, hold, squatFrame } from "./test-utils";
import type { EngineEvent, PoseFrame } from "./types";

interface RepSpec {
  to: number;
  outMs: number;
  backMs: number;
  lean?: number;
}

/** Plays a sequence of squat reps through the engine and returns every emitted event. */
function playSquats(specs: RepSpec[]): EngineEvent[] {
  const engine = new ExerciseEngine(squat);
  const events: EngineEvent[] = [];
  const feed = (frame: PoseFrame) => events.push(...engine.process(frame).events);

  let t = 0;
  for (const s of hold(175, t, 600)) feed(squatFrame(s.t, s.value));
  t += 600;
  for (const spec of specs) {
    for (const s of cycle({ from: 175, to: spec.to, outMs: spec.outMs, backMs: spec.backMs, startMs: t })) {
      // Lean is applied only near the bottom of the movement, like a real forward fold.
      const depth = (175 - s.value) / (175 - spec.to);
      feed(squatFrame(s.t, s.value, (spec.lean ?? 0) * depth));
    }
    t += spec.outMs + spec.backMs;
    for (const s of hold(175, t, 500)) feed(squatFrame(s.t, s.value));
    t += 500;
  }
  return events;
}

const reps = (events: EngineEvent[]) =>
  events.flatMap((e) => (e.type === "rep" ? [e.rep] : []));

describe("ExerciseEngine (squat)", () => {
  it("counts and numbers reps", () => {
    const events = playSquats(Array(3).fill({ to: 85, outMs: 1800, backMs: 1200 }));
    expect(reps(events).map((r) => r.index)).toEqual([1, 2, 3]);
  });

  it("scores a clean, controlled rep 100 with no faults", () => {
    const [rep] = reps(playSquats([{ to: 85, outMs: 1800, backMs: 1200 }]));
    expect(rep.faults).toEqual([]);
    expect(rep.score).toBe(100);
    expect(rep.eccentricMs).toBeGreaterThan(1100);
  });

  it("flags and penalises dropping too fast", () => {
    const [rep] = reps(playSquats([{ to: 85, outMs: 450, backMs: 1200 }]));
    expect(rep.faults.map((f) => f.id)).toContain("tempo");
    expect(rep.score).toBeLessThan(100);
  });

  it("emits a partial event with a depth cue for shallow reps", () => {
    const events = playSquats([{ to: 130, outMs: 1800, backMs: 1200 }]);
    expect(reps(events)).toHaveLength(0);
    const partial = events.find((e) => e.type === "partial");
    expect(partial?.type === "partial" && partial.rep.cue).toMatch(/deeper/i);
  });

  it("flags excessive forward lean at the bottom", () => {
    const [rep] = reps(playSquats([{ to: 85, outMs: 1800, backMs: 1200, lean: 75 }]));
    expect(rep.faults.map((f) => f.id)).toContain("torso-lean");
  });

  it("does not emit a rep when the pose is lost mid-set", () => {
    const engine = new ExerciseEngine(squat);
    for (const s of hold(175, 0, 600)) engine.process(squatFrame(s.t, s.value));
    const blind: PoseFrame = { t: 700, image: [], aspect: 0.5 };
    expect(engine.process(blind)).toEqual({ signal: null, events: [] });
  });

  it("reset() clears the rep count", () => {
    const engine = new ExerciseEngine(squat);
    for (const s of hold(175, 0, 600)) engine.process(squatFrame(s.t, s.value));
    for (const s of cycle({ from: 175, to: 85, outMs: 1800, backMs: 1200, startMs: 600 })) {
      engine.process(squatFrame(s.t, s.value));
    }
    for (const s of hold(175, 3600, 500)) engine.process(squatFrame(s.t, s.value));
    expect(engine.reps).toBe(1);
    engine.reset();
    expect(engine.reps).toBe(0);
  });
});

describe("summarizeSet", () => {
  it("summarises averages, top fault and fatigue across a set", () => {
    const specs: RepSpec[] = [
      { to: 85, outMs: 2000, backMs: 1200 },
      { to: 85, outMs: 2000, backMs: 1200 },
      { to: 85, outMs: 500, backMs: 1000 },
      { to: 85, outMs: 450, backMs: 1000 },
    ];
    const events = playSquats(specs);
    const summary = summarizeSet("squat", reps(events));

    expect(summary.reps).toBe(4);
    expect(summary.topFault?.id).toBe("tempo");
    expect(summary.topFault?.count).toBe(2);
    expect(summary.fatigue).not.toBeNull();
    expect(summary.fatigue!.eccentricChangePct).toBeLessThan(-50);
    expect(summary.fatigue!.scoreChange).toBeLessThan(0);
  });

  it("omits fatigue for very short sets", () => {
    const summary = summarizeSet("squat", reps(playSquats([{ to: 85, outMs: 1800, backMs: 1200 }])));
    expect(summary.fatigue).toBeNull();
  });

  it("handles an empty set", () => {
    const summary = summarizeSet("squat", []);
    expect(summary).toMatchObject({ reps: 0, avgScore: 0, bestRep: null, topFault: null });
  });
});

describe("compareSets", () => {
  it("reports positive deltas when the second set improves", () => {
    const slow = summarizeSet("squat", reps(playSquats(Array(3).fill({ to: 85, outMs: 450, backMs: 1000 }))));
    const good = summarizeSet("squat", reps(playSquats(Array(4).fill({ to: 85, outMs: 1800, backMs: 1200 }))));
    const delta = compareSets(slow, good);
    expect(delta.repsDelta).toBe(1);
    expect(delta.scoreDelta).toBeGreaterThan(0);
    expect(delta.eccentricDeltaMs).toBeGreaterThan(0);
  });
});

describe("live (mid-rep) cues", () => {
  const live = (events: EngineEvent[]) =>
    events.flatMap((e) => (e.type === "live" ? [e] : []));

  it("fires the depth cue at the turnaround, before the rep is over", () => {
    const events = playSquats([{ to: 130, outMs: 1800, backMs: 1200 }]);
    const liveIdx = events.findIndex((e) => e.type === "live" && e.fault.id === "depth");
    const partialIdx = events.findIndex((e) => e.type === "partial");
    expect(liveIdx).toBeGreaterThanOrEqual(0);
    expect(liveIdx).toBeLessThan(partialIdx);
    const partial = events[partialIdx];
    expect(partial.type === "partial" && partial.rep.announced).toBe(true);
  });

  it("flags a too-fast descent at the turnaround and marks it announced in the rep", () => {
    const events = playSquats([{ to: 85, outMs: 450, backMs: 1200 }]);
    expect(live(events).map((e) => e.fault.id)).toContain("tempo");
    const [rep] = reps(events);
    expect(rep.faults.find((f) => f.id === "tempo")?.announced).toBe(true);
  });

  it("flags excessive lean live and only once per rep", () => {
    const events = playSquats([{ to: 85, outMs: 1800, backMs: 1200, lean: 75 }]);
    expect(live(events).filter((e) => e.fault.id === "torso-lean")).toHaveLength(1);
  });

  it("stays silent on a clean rep", () => {
    const events = playSquats([{ to: 85, outMs: 1800, backMs: 1200 }]);
    expect(live(events)).toEqual([]);
  });

  it("fires again on the next rep (state resets between reps)", () => {
    const events = playSquats(Array(2).fill({ to: 130, outMs: 1800, backMs: 1200 }));
    expect(live(events).filter((e) => e.fault.id === "depth")).toHaveLength(2);
  });
});
