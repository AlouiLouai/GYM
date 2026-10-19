import { EXERCISES } from "../exercises/definitions";
import { faultLabel, type CoachRequest } from "./request";

/**
 * Deterministic coaching note built from the set's numbers. Used when the AI note is
 * unavailable (no API key, offline, rate-limited), so the summary is never empty.
 */
export function localCoachNote({ exercise, current, previous }: CoachRequest): string {
  const name = EXERCISES[exercise].name.toLowerCase();
  if (current.reps === 0) {
    return `No full ${name} reps were counted. Check your camera angle and try to reach full range of motion.`;
  }

  const parts: string[] = [];
  const quality =
    current.avgScore >= 85 ? "Strong set" : current.avgScore >= 65 ? "Decent set" : "Rough set";
  parts.push(
    `${quality}: ${current.reps} ${name} rep${current.reps === 1 ? "" : "s"} at ${current.avgScore}/100 form.`,
  );

  const top = [...current.faults].sort((a, b) => b.count - a.count)[0];
  if (top) {
    parts.push(`Biggest fix: ${faultLabel(top.id).toLowerCase()} (${top.count} of ${current.reps} reps).`);
  } else {
    parts.push("No form issues were flagged. Keep that quality as the weight goes up.");
  }

  if (current.fatigue && current.fatigue.scoreChange < -5) {
    parts.push("Form faded in the second half, so consider a lighter load or a shorter set.");
  }

  if (previous && previous.reps > 0) {
    const delta = current.avgScore - previous.avgScore;
    if (delta >= 3) parts.push(`That is ${Math.round(delta)} points better than your last set.`);
    else if (delta <= -3) parts.push(`That is ${Math.round(-delta)} points below your last set. Rest a little longer.`);
  }
  return parts.join(" ");
}
