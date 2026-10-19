import { angleAt, angleFromVertical, midpoint, type Vec3 } from "../geometry/angles";
import type { PoseFrame } from "../engine/types";
import { LM, MIN_VISIBILITY } from "../pose/landmarks";

/** Joint indices for one body side, as [a, vertex, c]. */
type Triplet = readonly [number, number, number];

interface Point extends Vec3 {
  visibility: number;
}

/**
 * Landmarks as metric 3D points. Prefers MediaPipe world landmarks (metres, view-independent).
 * Falls back to image landmarks, un-squashing x by the aspect ratio and dropping the unreliable z.
 */
function point(frame: PoseFrame, index: number): Point | null {
  const source = frame.world ?? frame.image;
  const lm = source[index];
  if (!lm) return null;
  const visibility = lm.visibility ?? frame.image[index]?.visibility ?? 0;
  if (frame.world) return { x: lm.x, y: lm.y, z: lm.z, visibility };
  return { x: lm.x * (frame.aspect ?? 1), y: lm.y, z: 0, visibility };
}

function tripletAngle(frame: PoseFrame, [a, b, c]: Triplet): { angle: number; weight: number } | null {
  const pa = point(frame, a);
  const pb = point(frame, b);
  const pc = point(frame, c);
  if (!pa || !pb || !pc) return null;
  const weight = Math.min(pa.visibility, pb.visibility, pc.visibility);
  return { angle: angleAt(pa, pb, pc), weight };
}

/**
 * Joint angle averaged over the left and right sides, weighted by how visible each side is.
 * Weighting (instead of picking a side) avoids the value jumping when visibility flips mid-rep,
 * and works from both front and side camera positions.
 */
export function bilateralAngle(frame: PoseFrame, left: Triplet, right: Triplet): number | null {
  let sum = 0;
  let weights = 0;
  for (const side of [left, right]) {
    const r = tripletAngle(frame, side);
    if (!r || r.weight < MIN_VISIBILITY) continue;
    sum += r.angle * r.weight;
    weights += r.weight;
  }
  return weights > 0 ? sum / weights : null;
}

export const KNEE: [Triplet, Triplet] = [
  [LM.leftHip, LM.leftKnee, LM.leftAnkle],
  [LM.rightHip, LM.rightKnee, LM.rightAnkle],
];
export const ELBOW: [Triplet, Triplet] = [
  [LM.leftShoulder, LM.leftElbow, LM.leftWrist],
  [LM.rightShoulder, LM.rightElbow, LM.rightWrist],
];
/** Torso–thigh angle: 180° standing tall, small when folded forward. */
export const HIP: [Triplet, Triplet] = [
  [LM.leftShoulder, LM.leftHip, LM.leftKnee],
  [LM.rightShoulder, LM.rightHip, LM.rightKnee],
];
/** Shoulder–hip–ankle: 180° for a straight plank line. */
export const BODY_LINE: [Triplet, Triplet] = [
  [LM.leftShoulder, LM.leftHip, LM.leftAnkle],
  [LM.rightShoulder, LM.rightHip, LM.rightAnkle],
];
/** Elbow–shoulder–hip: ~0° when the upper arm hangs beside the torso. */
export const UPPER_ARM: [Triplet, Triplet] = [
  [LM.leftElbow, LM.leftShoulder, LM.leftHip],
  [LM.rightElbow, LM.rightShoulder, LM.rightHip],
];

export const angleOf = ([left, right]: [Triplet, Triplet]) => (frame: PoseFrame) =>
  bilateralAngle(frame, left, right);

/** Torso tilt from vertical in degrees (0 = upright). */
export function torsoLean(frame: PoseFrame): number | null {
  const ls = point(frame, LM.leftShoulder);
  const rs = point(frame, LM.rightShoulder);
  const lh = point(frame, LM.leftHip);
  const rh = point(frame, LM.rightHip);
  if (!ls || !rs || !lh || !rh) return null;
  if (Math.min(ls.visibility, rs.visibility, lh.visibility, rh.visibility) < MIN_VISIBILITY * 0.6) {
    // Side-on views occlude one side; accept it if the other side is clear.
    const left = Math.min(ls.visibility, lh.visibility);
    const right = Math.min(rs.visibility, rh.visibility);
    if (Math.max(left, right) < MIN_VISIBILITY) return null;
    return left >= right ? angleFromVertical(lh, ls) : angleFromVertical(rh, rs);
  }
  return angleFromVertical(midpoint(lh, rh), midpoint(ls, rs));
}

/**
 * Knee spread ÷ ankle spread (front view only). Below ~0.85 the knees cave inward.
 * Returns null unless the camera sees the lifter face-on, since the ratio is meaningless side-on.
 */
export function kneeToAnkleRatio(frame: PoseFrame): number | null {
  const img = frame.image;
  const ls = img[LM.leftShoulder];
  const rs = img[LM.rightShoulder];
  const lk = img[LM.leftKnee];
  const rk = img[LM.rightKnee];
  const la = img[LM.leftAnkle];
  const ra = img[LM.rightAnkle];
  if (!ls || !rs || !lk || !rk || !la || !ra) return null;
  const vis = Math.min(lk.visibility ?? 0, rk.visibility ?? 0, la.visibility ?? 0, ra.visibility ?? 0);
  if (vis < MIN_VISIBILITY) return null;

  const aspect = frame.aspect ?? 1;
  const shoulderSpread = Math.abs(ls.x - rs.x) * aspect;
  if (shoulderSpread < 0.12) return null; // side-on: not measurable
  const ankleSpread = Math.abs(la.x - ra.x);
  if (ankleSpread < 0.02) return null;
  return Math.abs(lk.x - rk.x) / ankleSpread;
}
