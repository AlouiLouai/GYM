import { LM, type Landmark } from "../pose/landmarks";
import type { PoseFrame } from "./types";

/** Deterministic pseudo-random noise in [-amp, amp] so tests are reproducible. */
export function noise(seed: number, amp: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 2 * amp;
}

/** One smooth out-and-back cycle of a signal, sampled every `dtMs`. */
export function cycle(opts: {
  from: number;
  to: number;
  outMs: number;
  backMs: number;
  dtMs?: number;
  startMs: number;
}): { t: number; value: number }[] {
  const { from, to, outMs, backMs, startMs, dtMs = 33 } = opts;
  const samples: { t: number; value: number }[] = [];
  const ease = (u: number) => (1 - Math.cos(Math.PI * u)) / 2;
  for (let ms = 0; ms < outMs; ms += dtMs) {
    samples.push({ t: startMs + ms, value: from + (to - from) * ease(ms / outMs) });
  }
  for (let ms = 0; ms < backMs; ms += dtMs) {
    samples.push({ t: startMs + outMs + ms, value: to + (from - to) * ease(ms / backMs) });
  }
  return samples;
}

/** A still period at `value`. */
export function hold(value: number, startMs: number, durationMs: number, dtMs = 33) {
  const samples: { t: number; value: number }[] = [];
  for (let ms = 0; ms < durationMs; ms += dtMs) samples.push({ t: startMs + ms, value });
  return samples;
}

const blank = (): Landmark => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 });

/**
 * Builds a side-on skeleton whose knee angle is `kneeAngle` (degrees) and whose torso is
 * tilted `torsoLeanDeg` from vertical. y grows downward, as in MediaPipe.
 */
export function squatFrame(t: number, kneeAngle: number, torsoLeanDeg = 0): PoseFrame {
  const world = Array.from({ length: 33 }, blank);
  const rad = (d: number) => (d * Math.PI) / 180;
  const knee = { x: 0, y: 0, z: 0 };
  const hip = { x: 0, y: -1, z: 0 }; // above the knee
  const ankle = { x: Math.sin(rad(kneeAngle)), y: -Math.cos(rad(kneeAngle)), z: 0 };
  const shoulder = {
    x: hip.x + Math.sin(rad(torsoLeanDeg)),
    y: hip.y - Math.cos(rad(torsoLeanDeg)),
    z: 0,
  };
  for (const side of ["left", "right"] as const) {
    const set = (idx: number, pt: { x: number; y: number; z: number }) =>
      (world[idx] = { ...pt, visibility: 1 });
    set(LM[`${side}Knee`], knee);
    set(LM[`${side}Hip`], hip);
    set(LM[`${side}Ankle`], ankle);
    set(LM[`${side}Shoulder`], shoulder);
  }
  // Image landmarks are only used for visibility + the front-view gate; keep shoulders
  // at the same x so the frame reads as side-on.
  const image = world.map((l) => ({ x: 0.5, y: 0.5, z: 0, visibility: l.visibility }));
  return { t, image, world, aspect: 9 / 16 };
}

/** Joint angles in degrees. Unset joints default to a standing, arms-down pose. */
export interface BodyAngles {
  /** Torso tilt from vertical (0 = upright). */
  lean?: number;
  /** Shoulder–hip–knee. */
  hip?: number;
  /** Hip–knee–ankle. */
  knee?: number;
  /** Shoulder–elbow–wrist. */
  elbow?: number;
  /** Elbow–shoulder–hip (arm raised away from the torso). */
  upperArm?: number;
}

type V2 = readonly [number, number];
const add = (a: V2, b: V2, k = 1): V2 => [a[0] + b[0] * k, a[1] + b[1] * k];
const neg = (a: V2): V2 => [-a[0], -a[1]];
const rotate = (v: V2, deg: number): V2 => {
  const r = (deg * Math.PI) / 180;
  return [v[0] * Math.cos(r) - v[1] * Math.sin(r), v[0] * Math.sin(r) + v[1] * Math.cos(r)];
};

/**
 * A full-body side-on skeleton built by forward kinematics from joint angles, with both sides
 * identical. Lets a test drive any exercise's real `signal` and `checks` end to end.
 * Segment lengths are in metres; y is flipped because MediaPipe's y grows downward.
 */
export function bodyFrame(t: number, angles: BodyAngles = {}): PoseFrame {
  const { lean = 0, hip = 180, knee = 180, elbow = 180, upperArm = 10 } = angles;
  const hipPt: V2 = [0, 0];
  const torsoDir = rotate([0, 1], -lean);
  const shoulder = add(hipPt, torsoDir, 0.5);
  const thighDir = rotate(torsoDir, hip);
  const kneePt = add(hipPt, thighDir, 0.45);
  const anklePt = add(kneePt, rotate(neg(thighDir), knee), 0.45);
  const upperDir = rotate(neg(torsoDir), upperArm);
  const elbowPt = add(shoulder, upperDir, 0.3);
  const wristPt = add(elbowPt, rotate(neg(upperDir), elbow), 0.3);

  const world = Array.from({ length: 33 }, blank);
  const place = (idx: number, p: V2) => (world[idx] = { x: p[0], y: -p[1], z: 0, visibility: 1 });
  for (const side of ["left", "right"] as const) {
    place(LM[`${side}Shoulder`], shoulder);
    place(LM[`${side}Elbow`], elbowPt);
    place(LM[`${side}Wrist`], wristPt);
    place(LM[`${side}Hip`], hipPt);
    place(LM[`${side}Knee`], kneePt);
    place(LM[`${side}Ankle`], anklePt);
  }
  const image = world.map((l) => ({ x: 0.5, y: 0.5, z: 0, visibility: l.visibility }));
  return { t, image, world, aspect: 9 / 16 };
}
