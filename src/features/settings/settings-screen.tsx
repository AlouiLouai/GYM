"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LanguagePicker } from "@/components/language-picker";
import { VOICE_MODES } from "@/core/coach/voice-policy";
import { useI18n } from "@/lib/i18n";
import { AUTO_FINISH_OPTIONS, REST_OPTIONS, TARGET_OPTIONS, updateSettings, useSettings } from "@/lib/settings";
import { beep, buzz, canSpeak, primeSpeech, voicesFor } from "@/lib/speech";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Chips<T extends string | number | null>({
  options,
  value,
  label,
  onChange,
}: {
  options: readonly T[];
  value: T;
  label: (v: T) => string;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={`min-h-11 min-w-11 rounded-full px-4 py-2 text-sm font-medium active:scale-95 ${
            value === o ? "bg-lime-400 text-zinc-950" : "bg-zinc-800 text-zinc-200"
          }`}
        >
          {label(o)}
        </button>
      ))}
    </div>
  );
}

export function SettingsScreen() {
  const { lang, t } = useI18n();
  const settings = useSettings();

  // Voices load asynchronously and only exist in the browser.
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!canSpeak()) return;
    const load = () => setVoices(voicesFor(lang));
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, [lang]);
  const selected = voices.some((v) => v.name === settings.voiceName) ? settings.voiceName : "";

  const test = () => {
    if (settings.voiceMode === "chime") {
      primeSpeech(null, { lang });
      beep();
      setTimeout(buzz, 400);
      return;
    }
    const sample = `${t.voice.count(3)}. ${t.faults["torso-lean"].say}. ${t.voice.better}`;
    primeSpeech(sample, { lang, voiceName: settings.voiceName });
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        <Link href="/" className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-medium">
          {lang === "en" ? "←" : "→"} {t.ui.back}
        </Link>
        <h1 className="text-xl font-semibold">{t.ui.settingsTitle}</h1>
      </header>

      <Section title={t.ui.language}>
        <LanguagePicker label={t.ui.language} />
        {lang === "tn" && <p className="text-xs text-zinc-500">{t.ui.derjaNote}</p>}
      </Section>

      <Section title={t.ui.voiceMode}>
        <div role="radiogroup" className="flex flex-col gap-2">
          {VOICE_MODES.map((m) => {
            const [name, desc] = t.ui.voiceModes[m];
            const on = settings.voiceMode === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => updateSettings({ voiceMode: m })}
                className={`rounded-xl p-3 text-start active:scale-[0.99] ${
                  on ? "bg-lime-400 text-zinc-950" : "bg-zinc-900 text-zinc-200"
                }`}
              >
                <p className="font-semibold">{name}</p>
                <p className={`text-sm ${on ? "text-zinc-800" : "text-zinc-500"}`}>{desc}</p>
              </button>
            );
          })}
        </div>
      </Section>

      {canSpeak() && settings.voiceMode !== "off" && (
        <Section title={t.ui.voicePick}>
          {settings.voiceMode !== "chime" && (
            <>
              <select
                value={selected ?? ""}
                onChange={(e) => updateSettings({ voiceName: e.target.value || null })}
                className="h-11 rounded-xl bg-zinc-900 px-3 text-sm"
              >
                <option value="">{t.ui.voiceAuto}</option>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              {lang !== "en" && voices.length === 0 && <p className="text-xs text-amber-400">{t.ui.noArabicVoice}</p>}
            </>
          )}
          <button type="button" onClick={test} className="rounded-full bg-zinc-800 py-3 font-medium active:scale-95">
            ▶ {t.ui.testVoice}
          </button>
        </Section>
      )}

      <Section title={t.ui.unit}>
        <Chips options={["kg", "lb"] as const} value={settings.unit} label={(u) => u} onChange={(unit) => updateSettings({ unit })} />
      </Section>

      <Section title={t.ui.restTime}>
        <Chips
          options={REST_OPTIONS}
          value={settings.restSec as (typeof REST_OPTIONS)[number]}
          label={(s) => (s === 0 ? t.ui.off_ : s < 120 ? `${s}s` : `${s / 60}m`)}
          onChange={(restSec) => updateSettings({ restSec })}
        />
      </Section>

      <Section title={t.ui.autoFinish}>
        <Chips
          options={AUTO_FINISH_OPTIONS}
          value={settings.autoFinishSec as (typeof AUTO_FINISH_OPTIONS)[number]}
          label={(s) => (s === 0 ? t.ui.off_ : `${s}s`)}
          onChange={(autoFinishSec) => updateSettings({ autoFinishSec })}
        />
        <p className="text-xs text-zinc-500">{t.ui.autoFinishHint}</p>
      </Section>

      <Section title={t.ui.haptics}>
        <Chips
          options={["true", "false"]}
          value={String(settings.haptics)}
          label={(v) => (v === "true" ? t.ui.on : t.ui.off)}
          onChange={(v) => {
            updateSettings({ haptics: v === "true" });
            if (v === "true") navigator.vibrate?.(35);
          }}
        />
      </Section>

      <Section title={t.ui.defaultTarget}>
        <Chips
          options={TARGET_OPTIONS}
          value={settings.targetReps as (typeof TARGET_OPTIONS)[number]}
          label={(n) => (n === null ? t.ui.free : String(n))}
          onChange={(targetReps) => updateSettings({ targetReps })}
        />
      </Section>

      <Section title={t.ui.debug}>
        <Chips
          options={[false, true].map(String)}
          value={String(settings.debug)}
          label={(v) => (v === "true" ? t.ui.on : t.ui.off)}
          onChange={(v) => updateSettings({ debug: v === "true" })}
        />
      </Section>
    </main>
  );
}
