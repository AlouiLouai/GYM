/** A single pose landmark. Structurally compatible with MediaPipe's output. */
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/** MediaPipe BlazePose landmark indices (33-point topology). */
export const LM = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

export const MIN_VISIBILITY = 0.5;

export function isVisible(landmark: Landmark | undefined, min = MIN_VISIBILITY): boolean {
  if (!landmark) return false;
  if ((landmark.visibility ?? 0) < min) return false;
  return landmark.x >= 0 && landmark.x <= 1 && landmark.y >= 0 && landmark.y <= 1;
}
