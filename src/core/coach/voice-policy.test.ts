import { describe, expect, it } from "vitest";
import { VoicePolicy } from "./voice-policy";

const types = (line: ReturnType<VoicePolicy["rep"]>) => line?.intents.map((i) => i.type) ?? [];

describe("VoicePolicy (smart)", () => {
  it("corrects a repeating fault once, then waits out the cooldown", () => {
    const p = new VoicePolicy("smart");
    expect(p.live("torso-lean")).not.toBeNull(); // during rep 1
    p.rep(1, ["torso-lean"], []);
    expect(p.live("torso-lean")).toBeNull(); // rep 2
    p.rep(2, ["torso-lean"], []);
    expect(p.live("torso-lean")).toBeNull(); // rep 3
    p.rep(3, ["torso-lean"], []);
    expect(p.live("torso-lean")).not.toBeNull(); // rep 4: cooldown over
  });

  it("still says a different fault right away", () => {
    const p = new VoicePolicy("smart");
    p.live("torso-lean");
    expect(p.live("knee-cave")).not.toBeNull();
  });

  it("praises once when a coached fault is fixed", () => {
    const p = new VoicePolicy("smart");
    p.live("torso-lean");
    p.rep(1, ["torso-lean"], []);
    expect(types(p.rep(2, [], []))).toEqual(["count", "better"]);
    expect(types(p.rep(3, [], []))).toEqual(["count"]);
  });

  it("counts down to the target", () => {
    const p = new VoicePolicy("smart", 5);
    expect(types(p.rep(3, [], []))).toEqual(["count", "twoMore"]);
    expect(types(p.rep(4, [], []))).toEqual(["count", "lastOne"]);
    expect(types(p.rep(5, [], []))).toEqual(["done"]);
  });

  it("speaks a fault found only at rep end, with the count", () => {
    const p = new VoicePolicy("smart");
    const line = p.rep(1, ["tempo"], ["tempo"]);
    expect(types(line)).toEqual(["count", "fault"]);
    expect(line?.priority).toBe(2);
  });
});

describe("VoicePolicy (other modes)", () => {
  it("'all' repeats every fault", () => {
    const p = new VoicePolicy("all");
    p.live("torso-lean");
    p.rep(1, ["torso-lean"], []);
    expect(p.live("torso-lean")).not.toBeNull();
  });

  it("'reps' only counts", () => {
    const p = new VoicePolicy("reps");
    expect(p.live("torso-lean")).toBeNull();
    expect(types(p.rep(1, ["tempo"], ["tempo"]))).toEqual(["count"]);
  });

  it("'chime' beeps and buzzes, 'off' says nothing", () => {
    const chime = new VoicePolicy("chime");
    expect(types(chime.rep(1, [], []))).toEqual(["beep"]);
    expect(types(chime.rep(2, ["tempo"], []))).toEqual(["buzz"]);
    const off = new VoicePolicy("off");
    expect(off.live("tempo")).toBeNull();
    expect(off.rep(1, [], [])).toBeNull();
  });
});
