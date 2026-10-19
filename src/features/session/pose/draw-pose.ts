import { isVisible, type Landmark } from "@/core/pose/landmarks";
import type { Connection } from "./create-landmarker";

const BONE_COLOR = "rgba(163, 230, 53, 0.9)";
const JOINT_COLOR = "#fafafa";

/** Draws the skeleton. Canvas pixel size must equal the video's intrinsic size. */
export function drawPose(
  ctx: CanvasRenderingContext2D,
  landmarks: readonly Landmark[] | undefined,
  connections: readonly Connection[],
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (!landmarks) return;

  const lineWidth = Math.max(3, width / 200);
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.strokeStyle = BONE_COLOR;

  ctx.beginPath();
  for (const { start, end } of connections) {
    const a = landmarks[start];
    const b = landmarks[end];
    if (!isVisible(a) || !isVisible(b)) continue;
    ctx.moveTo(a.x * width, a.y * height);
    ctx.lineTo(b.x * width, b.y * height);
  }
  ctx.stroke();

  ctx.fillStyle = JOINT_COLOR;
  // Skip face points (1-10); they add clutter and are irrelevant to lifting form.
  for (let i = 11; i < landmarks.length; i++) {
    const p = landmarks[i];
    if (!isVisible(p)) continue;
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, lineWidth * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}
