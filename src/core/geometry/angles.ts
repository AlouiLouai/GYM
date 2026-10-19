export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const RAD_TO_DEG = 180 / Math.PI;

/** Angle in degrees at vertex `b` formed by the segments b→a and b→c (0–180). */
export function angleAt(a: Vec3, b: Vec3, c: Vec3): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const abz = a.z - b.z;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const cbz = c.z - b.z;
  const dot = abx * cbx + aby * cby + abz * cbz;
  const mag = Math.hypot(abx, aby, abz) * Math.hypot(cbx, cby, cbz);
  if (mag === 0) return 0;
  // Clamp: floating-point error can push the cosine marginally outside [-1, 1].
  return Math.acos(Math.min(1, Math.max(-1, dot / mag))) * RAD_TO_DEG;
}

/**
 * Angle in degrees between the vector `from → to` and the vertical axis (0 = upright,
 * 90 = horizontal). Sign-agnostic, so it doesn't depend on the y-axis direction.
 */
export function angleFromVertical(from: Vec3, to: Vec3): number {
  const dy = Math.abs(to.y - from.y);
  const horizontal = Math.hypot(to.x - from.x, to.z - from.z);
  return Math.atan2(horizontal, dy) * RAD_TO_DEG;
}

export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}
