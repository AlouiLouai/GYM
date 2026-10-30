"use client";

import { LANGS } from "@/core/i18n";
import { updateSettings, useSettings } from "@/lib/settings";

export function LanguagePicker({ label }: { label: string }) {
  const { lang } = useSettings();
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={lang === l.id}
          onClick={() => updateSettings({ lang: l.id })}
          className={`min-h-11 flex-1 rounded-full px-4 py-2 text-sm font-semibold active:scale-95 ${
            lang === l.id ? "bg-lime-400 text-zinc-950" : "bg-zinc-800 text-zinc-200"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
