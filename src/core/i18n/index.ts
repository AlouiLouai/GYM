import type { ExerciseId } from "../engine/types";
import { ar } from "./ar";
import { en, type Messages, type Phrase } from "./en";
import { tn } from "./tn";

export type { Messages, Phrase };

export type Lang = "en" | "ar" | "tn";

export interface LangInfo {
  id: Lang;
  /** Name in its own language, for the picker. */
  label: string;
  dir: "ltr" | "rtl";
  /** BCP 47 tags to look for in the device's speech voices, most specific first. */
  speech: readonly string[];
}

export const LANGS: readonly LangInfo[] = [
  { id: "en", label: "English", dir: "ltr", speech: ["en-US", "en-GB", "en"] },
  { id: "ar", label: "العربية", dir: "rtl", speech: ["ar-SA", "ar-EG", "ar"] },
  { id: "tn", label: "تونسي", dir: "rtl", speech: ["ar-TN", "ar-DZ", "ar-MA", "ar-SA", "ar"] },
];

export const isLang = (v: unknown): v is Lang => v === "en" || v === "ar" || v === "tn";

const MESSAGES: Record<Lang, Messages> = { en, ar, tn };

export const messages = (lang: Lang): Messages => MESSAGES[lang];
export const langInfo = (lang: Lang): LangInfo => LANGS.find((l) => l.id === lang)!;

/** Display label of a fault id in this language (falls back to the id itself). */
export function faultLabel(lang: Lang, id: string): string {
  return messages(lang).faults[id]?.label ?? en.faults[id]?.label ?? id;
}

/** The on-screen and spoken cue for a fault on a given exercise. */
export function faultCue(lang: Lang, exercise: ExerciseId, id: string): Phrase {
  const m = messages(lang);
  if (id === "depth") return m.exercises[exercise].partial;
  if (id === "tempo") return m.exercises[exercise].tooFast;
  return m.faults[id] ?? { show: id, say: "" };
}
