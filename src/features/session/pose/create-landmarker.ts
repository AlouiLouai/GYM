import type { PoseLandmarker } from "@mediapipe/tasks-vision";

// Both are self-hosted under /public (see scripts/setup-assets.mjs) so the app
// works offline once the service worker has cached them.
const WASM_PATH = "/wasm";
const MODEL_PATH = "/models/pose_landmarker_lite.task";

export type Delegate = "GPU" | "CPU";

export interface Connection {
  start: number;
  end: number;
}

export interface LandmarkerHandle {
  landmarker: PoseLandmarker;
  delegate: Delegate;
  /** Skeleton bones, as pairs of landmark indices. */
  connections: readonly Connection[];
}

/**
 * Prefers the GPU delegate and falls back to CPU (some mobile browsers lack WebGL2 support).
 * The MediaPipe library is imported here, on demand, so the session page itself renders and
 * becomes interactive without downloading ~300 KB of vision code until the lifter taps Start.
 */
export async function createPoseLandmarker(): Promise<LandmarkerHandle> {
  const { FilesetResolver, PoseLandmarker: Landmarker } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
  const create = (delegate: Delegate) =>
    Landmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  const connections = Landmarker.POSE_CONNECTIONS;
  try {
    return { landmarker: await create("GPU"), delegate: "GPU", connections };
  } catch {
    return { landmarker: await create("CPU"), delegate: "CPU", connections };
  }
}
