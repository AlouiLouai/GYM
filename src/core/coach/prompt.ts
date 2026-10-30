import { EXERCISES } from "../exercises/definitions";
import type { Lang } from "../i18n";
import { faultLabel, type CoachRequest, type SetStats } from "./request";

export const SYSTEM_INSTRUCTION = [
  "You are a concise, encouraging strength coach reviewing one set measured by a phone camera.",
  "Use ONLY the numbers provided. Never invent measurements, injuries or weights.",
  "Write at most 3 short sentences, plain text, no markdown or lists.",
  "Mention one thing that went well, the single most important fix, and one concrete tip for the next set.",
  "If a previous set is given, compare briefly. This is not medical advice; do not diagnose.",
].join(" ");

const LANGUAGE_INSTRUCTION: Record<Lang, string> = {
  en: "Write in English.",
  ar: "Write in Modern Standard Arabic.",
  tn: "Write in Tunisian Arabic (Derja) in Arabic script, the casual way Tunisian gym-goers talk; French gym words are fine.",
};

/** The system instruction for a request, including the language to answer in. */
export const systemInstruction = (lang: Lang = "en") => `${SYSTEM_INSTRUCTION} ${LANGUAGE_INSTRUCTION[lang]}`;

function describe(label: string, s: SetStats): string {
  const faults = s.faults.length
    ? s.faults.map((f) => `${faultLabel(f.id)} x${f.count}`).join(", ")
    : "none";
  const lines = [
    `${label}: ${s.reps} full reps, ${s.partialReps} partial reps not counted`,
    `average form score ${s.avgScore}/100`,
    `average range of motion ${s.avgRangeOfMotion} degrees`,
    `average lowering time ${(s.avgEccentricMs / 1000).toFixed(1)} s`,
    `form issues: ${faults}`,
  ];
  if (s.fatigue) {
    lines.push(
      `second half vs first half: form ${s.fatigue.scoreChange >= 0 ? "+" : ""}${s.fatigue.scoreChange} points, ` +
        `range of motion ${s.fatigue.romChangePct}%, lowering time ${s.fatigue.eccentricChangePct}%`,
    );
  }
  return lines.join("; ");
}

export function buildPrompt(request: CoachRequest): string {
  const name = EXERCISES[request.exercise].name;
  const parts = [`Exercise: ${name}.`, describe("This set", request.current)];
  if (request.previous) parts.push(describe("Previous set", request.previous));
  return parts.join("\n");
}
