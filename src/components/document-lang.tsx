"use client";

import { useDocumentLang } from "@/lib/i18n";

/** Keeps <html lang dir> following the language setting after load. */
export function DocumentLang() {
  useDocumentLang();
  return null;
}
