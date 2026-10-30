import { faultLabel, messages } from "../i18n";
import type { CoachRequest } from "./request";

/**
 * Deterministic coaching note built from the set's numbers, in the request's language. Used when the
 * AI note is unavailable (no API key, offline, rate-limited), so the summary is never empty.
 */
export function localCoachNote({ exercise, current, previous, lang = "en" }: CoachRequest): string {
  const { note, exercises } = messages(lang);
  const name = exercises[exercise].name;
  if (current.reps === 0) return note.noReps(name);

  const parts = [note.headline(note.quality(current.avgScore), current.reps, name, current.avgScore)];

  const top = [...current.faults].sort((a, b) => b.count - a.count)[0];
  parts.push(top ? note.biggestFix(faultLabel(lang, top.id), top.count, current.reps) : note.clean);

  if (current.fatigue && current.fatigue.scoreChange < -5) parts.push(note.faded);

  if (previous && previous.reps > 0) {
    const delta = current.avgScore - previous.avgScore;
    if (delta >= 3) parts.push(note.better(Math.round(delta)));
    else if (delta <= -3) parts.push(note.worse(Math.round(-delta)));
  }
  return parts.join(" ");
}
