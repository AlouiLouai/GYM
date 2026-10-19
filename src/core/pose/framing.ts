import { isVisible, LM, type Landmark } from "./landmarks";

export type Framing = "no-person" | "partial" | "full-body";

const FULL_BODY_JOINTS = [
  LM.leftShoulder,
  LM.rightShoulder,
  LM.leftHip,
  LM.rightHip,
  LM.leftKnee,
  LM.rightKnee,
  LM.leftAnkle,
  LM.rightAnkle,
];

/**
 * Judges whether the user is framed well enough to be coached.
 * Pose estimation is only trustworthy when the joints we measure are in view,
 * so the setup screen uses this to tell the user to step back / adjust the phone.
 */
export function assessFraming(landmarks: readonly Landmark[] | undefined): Framing {
  if (!landmarks || landmarks.length === 0) return "no-person";
  const visible = FULL_BODY_JOINTS.filter((i) => isVisible(landmarks[i])).length;
  if (visible === 0) return "no-person";
  // Side-on views hide one half of the body, so 6 of 8 key joints is enough.
  return visible >= 6 ? "full-body" : "partial";
}
