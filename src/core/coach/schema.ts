import "server-only";
import { z } from "zod";
import type { ExerciseId } from "../engine/types";
import { EXERCISES } from "../exercises/definitions";
import { FAULT_LABELS, type CoachRequest, type SetStats } from "./request";

// Server-only runtime validation of the /api/coach body. Never import this from client code:
// it would pull zod into the browser bundle (and zod's JIT probe trips strict CSPs).

const EXERCISE_IDS = Object.keys(EXERCISES) as [ExerciseId, ...ExerciseId[]];
const count = z.number().int().min(0).max(500);

export const SetStatsSchema: z.ZodType<SetStats> = z.object({
  reps: count,
  partialReps: count,
  avgScore: z.number().min(0).max(100),
  avgRangeOfMotion: z.number().min(0).max(360),
  avgEccentricMs: z.number().min(0).max(120_000),
  faults: z
    .array(
      z.object({
        // Only ids the engine can produce are accepted: blocks free text reaching the prompt.
        id: z.string().refine((id) => id in FAULT_LABELS, "unknown fault id"),
        count,
      }),
    )
    .max(12),
  fatigue: z
    .object({
      romChangePct: z.number().min(-100).max(500),
      eccentricChangePct: z.number().min(-100).max(1000),
      scoreChange: z.number().min(-100).max(100),
    })
    .nullable(),
});

export const CoachRequestSchema: z.ZodType<CoachRequest> = z.object({
  exercise: z.enum(EXERCISE_IDS),
  current: SetStatsSchema,
  previous: SetStatsSchema.nullable(),
});
