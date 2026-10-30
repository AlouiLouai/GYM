"use client";

import type { ExerciseId } from "@/core/engine/types";
import { ghostFor } from "@/core/exercises/ghost";

/**
 * The exercise's start position as a dashed outline, shown while the lifter sets up the camera.
 * It turns solid lime once the whole body is in frame.
 */
export function GhostOverlay({ exercise, inFrame, label }: { exercise: ExerciseId; inFrame: boolean; label: string }) {
  const { bones, head } = ghostFor(exercise);
  const stroke = inFrame ? "rgb(163 230 53)" : "rgb(250 250 250)";
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
      <svg
        viewBox="0 0 1 1"
        preserveAspectRatio="xMidYMid meet"
        className={`h-[70%] w-[90%] transition-opacity duration-500 ${inFrame ? "opacity-40" : "opacity-70"}`}
        fill="none"
        stroke={stroke}
        strokeWidth={0.018}
        strokeLinecap="round"
        strokeDasharray={inFrame ? undefined : "0.03 0.025"}
      >
        {bones.map(([a, b], i) => (
          <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
        ))}
        <circle cx={head.center[0]} cy={head.center[1]} r={head.r} />
      </svg>
      <p className="mt-2 rounded-full bg-zinc-900/80 px-4 py-2 text-sm font-medium text-zinc-100 backdrop-blur">{label}</p>
    </div>
  );
}
