import type { ExerciseId } from "../engine/types";

/** Start-position joint angles (degrees), same meaning as the synthetic test skeleton. */
interface SideAngles {
  /** Torso tilt from vertical; 90 = horizontal, head toward +x. */
  lean?: number;
  hip?: number;
  knee?: number;
  elbow?: number;
  upperArm?: number;
  /** Arm points to the other side of the torso (e.g. arms up on a bench instead of down to the floor). */
  flipArm?: boolean;
}

type Preset =
  | "standing"
  | "rack"
  | "overhead"
  | "hanging"
  | "plank"
  | "bench"
  | "lying"
  | "bridge"
  | "hinge"
  | "seated"
  | "front";

const SIDE: Record<Exclude<Preset, "front">, SideAngles> = {
  standing: {},
  rack: { upperArm: 160, elbow: 70 },
  overhead: { upperArm: 175, elbow: 60 },
  hanging: { upperArm: 175 },
  plank: { lean: 90, upperArm: 90 },
  bench: { lean: 90, upperArm: 90, flipArm: true },
  lying: { lean: 90, upperArm: 170 },
  bridge: { lean: 90, hip: 120, knee: 70, upperArm: 10 },
  hinge: { lean: 55, hip: 130, knee: 165, upperArm: 55 },
  seated: { hip: 90, knee: 90 },
};

const PRESET: Record<ExerciseId, Preset> = {
  squat: "standing",
  lunge: "standing",
  deadlift: "standing",
  "romanian-deadlift": "standing",
  "glute-bridge": "bridge",
  "push-up": "plank",
  dip: "standing",
  "shoulder-press": "rack",
  "lateral-raise": "front",
  "pull-up": "hanging",
  "bent-over-row": "hinge",
  "bicep-curl": "standing",
  "bench-press": "bench",
  "goblet-squat": "standing",
  "bulgarian-split-squat": "standing",
  "hip-thrust": "bridge",
  "front-raise": "standing",
  "overhead-tricep-extension": "overhead",
  "hammer-curl": "standing",
  "chin-up": "hanging",
  "sit-up": "bridge",
  "hanging-leg-raise": "hanging",
  "jumping-jack": "front",
  "front-squat": "standing",
  "sumo-squat": "standing",
  "reverse-lunge": "standing",
  "jump-squat": "standing",
  "good-morning": "standing",
  "sumo-deadlift": "standing",
  "kettlebell-swing": "standing",
  "incline-push-up": "plank",
  "diamond-push-up": "plank",
  "pike-push-up": "plank",
  "bench-dip": "seated",
  "close-grip-bench-press": "bench",
  "skull-crusher": "bench",
  "arnold-press": "rack",
  "upright-row": "front",
  "inverted-row": "bench",
  "one-arm-row": "hinge",
  "lying-leg-raise": "lying",
  plank: "plank",
  "side-plank": "plank",
  "wall-sit": "seated",
};

type P = readonly [number, number];
export interface Ghost {
  /** Line segments in a unit box (0–1, y down), fitted and centred. */
  bones: readonly (readonly [P, P])[];
  head: { center: P; r: number };
}

const rot = ([x, y]: P, deg: number): P => {
  const r = (deg * Math.PI) / 180;
  return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
};
const add = (a: P, b: P, k = 1): P => [a[0] + b[0] * k, a[1] + b[1] * k];
const neg = (a: P): P => [-a[0], -a[1]];

/** Forward kinematics, y up, as in the test skeleton (lengths in metres). */
function side(a: SideAngles) {
  const { lean = 0, hip = 180, knee = 180, elbow = 180, upperArm = 10, flipArm = false } = a;
  const hipPt: P = [0, 0];
  const torso = rot([0, 1], -lean);
  const shoulder = add(hipPt, torso, 0.5);
  const thigh = rot(torso, hip);
  const kneePt = add(hipPt, thigh, 0.45);
  const ankle = add(kneePt, rot(neg(thigh), knee), 0.45);
  const upper = rot(neg(torso), flipArm ? -upperArm : upperArm);
  const elbowPt = add(shoulder, upper, 0.3);
  const wrist = add(elbowPt, rot(neg(upper), flipArm ? -elbow : elbow), 0.28);
  const head = add(shoulder, torso, 0.16);
  return {
    bones: [
      [shoulder, hipPt],
      [hipPt, kneePt],
      [kneePt, ankle],
      [shoulder, elbowPt],
      [elbowPt, wrist],
    ] as [P, P][],
    head,
  };
}

/** Facing the camera, arms by the sides. */
function front() {
  const bones: [P, P][] = [];
  for (const s of [-1, 1]) {
    const sh: P = [0.19 * s, 0.5];
    const hp: P = [0.11 * s, 0];
    const kn: P = [0.12 * s, -0.45];
    bones.push([sh, hp], [hp, kn], [kn, [0.12 * s, -0.9]], [sh, [0.24 * s, 0.22]], [[0.24 * s, 0.22], [0.26 * s, -0.05]]);
  }
  bones.push([[-0.19, 0.5], [0.19, 0.5]], [[-0.11, 0], [0.11, 0]]);
  return { bones, head: [0, 0.66] as P };
}

const HEAD_R = 0.1;

/** The outline of `id`'s start position, for lining up the camera before the first rep. */
export function ghostFor(id: ExerciseId): Ghost {
  const preset = PRESET[id];
  const raw = preset === "front" ? front() : side(SIDE[preset]);
  const pts = [...raw.bones.flat(), add(raw.head, [HEAD_R, HEAD_R]), add(raw.head, [-HEAD_R, -HEAD_R])];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // Fit into 80% of the box, keep proportions, flip y (image y grows downward).
  const scale = 0.8 / Math.max(maxX - minX, maxY - minY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const map = ([x, y]: P): P => [0.5 + (x - cx) * scale, 0.5 - (y - cy) * scale];
  return {
    bones: raw.bones.map(([a, b]) => [map(a), map(b)] as const),
    head: { center: map(raw.head), r: HEAD_R * scale },
  };
}
