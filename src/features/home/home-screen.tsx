"use client";

import Link from "next/link";
import { InstallHint } from "@/components/install-hint";
import { LanguagePicker } from "@/components/language-picker";
import { currentStreak, setsInLastDays } from "@/core/history/stats";
import { useHistory } from "@/lib/history";
import { useI18n } from "@/lib/i18n";
import { updateSettings, useSettings } from "@/lib/settings";
import { useNow } from "@/lib/use-now";

export function HomeScreen() {
  const { t } = useI18n();
  const history = useHistory();
  const now = useNow();
  const { seenIntro } = useSettings();
  const streak = currentStreak(history, now);
  const week = setsInLastDays(history, 7, now);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
      <h1 className="text-4xl font-bold tracking-tight" dir="ltr">
        Gym <span className="text-accent">Coach</span>
      </h1>
      <p className="max-w-sm text-zinc-400">{t.ui.tagline}</p>

      <div className="flex w-full max-w-sm items-center justify-center gap-3 rounded-2xl bg-zinc-900 p-4">
        <span className="text-3xl" aria-hidden>
          {streak > 0 ? "🔥" : "💪"}
        </span>
        <div className="text-start">
          <p className="font-semibold">{streak > 0 ? t.ui.streak(streak) : t.ui.noStreak}</p>
          {week > 0 && <p className="text-sm text-zinc-500">{t.ui.weekSets(week)}</p>}
        </div>
      </div>

      {!seenIntro && history.length === 0 && (
        <section className="w-full max-w-sm rounded-2xl bg-zinc-900 p-4 text-start" aria-label={t.ui.howTitle}>
          <h2 className="font-semibold">{t.ui.howTitle}</h2>
          <ol className="mt-3 flex flex-col gap-3">
            {t.ui.howSteps.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-zinc-300">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-lime-400 text-xs font-bold text-zinc-950">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => updateSettings({ seenIntro: true })}
            className="mt-4 w-full rounded-full bg-zinc-800 py-2.5 text-sm font-medium active:scale-95"
          >
            {t.ui.gotIt}
          </button>
        </section>
      )}

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link
          href="/session"
          className="rounded-full bg-accent px-8 py-4 text-lg font-semibold text-zinc-950 active:scale-95"
        >
          {t.ui.start}
        </Link>
        <div className="flex gap-3">
          <Link href="/history" className="flex-1 rounded-full bg-zinc-800 px-4 py-3 font-medium active:scale-95">
            🏆 {t.ui.history}
          </Link>
          <Link href="/settings" className="rounded-full bg-zinc-800 px-5 py-3 font-medium active:scale-95">
            ⚙️ <span className="sr-only">{t.ui.settings}</span>
          </Link>
        </div>
      </div>

      <div className="w-full max-w-sm">
        <LanguagePicker label={t.ui.language} />
      </div>
      <InstallHint />
    </main>
  );
}
