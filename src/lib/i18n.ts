"use client";

import { useEffect } from "react";
import { langInfo, messages, type Lang, type Messages } from "@/core/i18n";
import { useSettings } from "./settings";

/** Current language and its messages. */
export function useI18n(): { lang: Lang; t: Messages } {
  const { lang } = useSettings();
  return { lang, t: messages(lang) };
}

/** Keeps <html lang dir> in sync with the chosen language (the inline script in layout sets it before paint). */
export function useDocumentLang() {
  const { lang } = useSettings();
  useEffect(() => {
    document.documentElement.lang = lang === "tn" ? "ar-TN" : lang;
    document.documentElement.dir = langInfo(lang).dir;
  }, [lang]);
}
