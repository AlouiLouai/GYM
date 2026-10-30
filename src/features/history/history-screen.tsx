"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { currentStreak, dayKey, formatWeight, groupByDay, personalRecords, type SetRecord } from "@/core/history/stats";
import { faultLabel, type Lang } from "@/core/i18n";
import { addSet, clearHistory, deleteSet, useHistory } from "@/lib/history";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useNow } from "@/lib/use-now";
import { formatClock } from "@/features/session/use-rest-timer";
import { WeeklyChart } from "./weekly-chart";

const LOCALE: Record<Lang, string> = { en: "en", ar: "ar", tn: "ar-TN" };

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-zinc-900 p-3 text-center">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

export function HistoryScreen() {
  const { lang, t } = useI18n();
  const { unit } = useSettings();
  const history = useHistory();
  const prs = personalRecords(history);
  const days = groupByDay(history);

  // Deleting is instant (no confirm dialog mid-scroll); a toast offers Undo for a few seconds instead.
  const [removed, setRemoved] = useState<SetRecord | null>(null);
  useEffect(() => {
    if (!removed) return;
    const id = setTimeout(() => setRemoved(null), 5000);
    return () => clearTimeout(id);
  }, [removed]);

  const now = useNow();
  const today = dayKey(now);
  const yesterday = dayKey(now - 86_400_000);
  const dayTitle = (key: string) => {
    if (key === today) return t.ui.today;
    if (key === yesterday) return t.ui.yesterday;
    const [y, m, d] = key.split("-").map(Number);
    return new Intl.DateTimeFormat(LOCALE[lang], { weekday: "long", day: "numeric", month: "long" }).format(
      new Date(y, m - 1, d),
    );
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        <Link href="/" className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-medium">
          {lang === "en" ? "←" : "→"} {t.ui.back}
        </Link>
        <h1 className="text-xl font-semibold">{t.ui.historyTitle}</h1>
      </header>

      {history.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-zinc-400">
          <p className="text-5xl">🏋️</p>
          <p>{t.ui.historyEmpty}</p>
          <Link href="/session" className="rounded-full bg-lime-400 px-6 py-3 font-semibold text-zinc-950">
            {t.ui.start}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <Tile label="🔥" value={currentStreak(history, now)} />
            <Tile label={t.ui.days} value={new Set(history.map((r) => dayKey(r.at))).size} />
            <Tile label={t.ui.totalSets} value={history.length} />
            <Tile label={t.ui.totalReps} value={history.reduce((a, r) => a + r.reps, 0)} />
          </div>

          <WeeklyChart history={history} now={now} unit={unit} locale={LOCALE[lang]} />

          <section>
            <h2 className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">🏆 {t.ui.prs}</h2>
            <div className="flex flex-col gap-2">
              {prs.map((pr) => (
                <div key={pr.exercise} className="rounded-xl bg-zinc-900 p-3">
                  <p className="font-semibold">
                    {t.exercises[pr.exercise].name}{" "}
                    <span className="text-xs text-zinc-500">· {t.ui.sets(pr.sets)}</span>
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {pr.bestWeight && (
                      <>
                        <dt className="text-zinc-500">{t.ui.bestWeight}</dt>
                        <dd className="font-medium" dir="ltr">
                          {formatWeight(pr.bestWeight.kg, unit)} × {pr.bestWeight.reps}
                        </dd>
                      </>
                    )}
                    {pr.bestE1rm && (
                      <>
                        <dt className="text-zinc-500">{t.ui.est1rm}</dt>
                        <dd className="font-medium" dir="ltr">
                          {formatWeight(pr.bestE1rm, unit)}
                        </dd>
                      </>
                    )}
                    {pr.longestHoldSec > 0 ? (
                      <>
                        <dt className="text-zinc-500">{t.ui.longestHold}</dt>
                        <dd className="font-medium" dir="ltr">
                          {formatClock(pr.longestHoldSec)}
                        </dd>
                      </>
                    ) : (
                      <>
                        <dt className="text-zinc-500">{t.ui.mostReps}</dt>
                        <dd className="font-medium">{pr.mostReps}</dd>
                      </>
                    )}
                    <dt className="text-zinc-500">{t.ui.bestForm}</dt>
                    <dd className="font-medium" dir="ltr">
                      {pr.bestScore}/100
                    </dd>
                  </dl>
                </div>
              ))}
            </div>
          </section>

          {days.map(({ day, sets }) => (
            <section key={day}>
              <h2 className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                {dayTitle(day)} · {t.ui.sets(sets.length)}
              </h2>
              <ul className="flex flex-col gap-2">
                {sets.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 rounded-xl bg-zinc-900 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{t.exercises[s.exercise].name}</p>
                      <p className="text-sm text-zinc-400">
                        <span dir="ltr">
                          {s.holdSec !== undefined ? (
                            `⏱ ${formatClock(s.holdSec)}`
                          ) : (
                            <>
                              {s.reps}
                              {s.weightKg ? ` × ${formatWeight(s.weightKg, unit)}` : ""}
                            </>
                          )}
                        </span>
                        {" · "}
                        <span dir="ltr">{s.avgScore}/100</span>
                        {s.rpe && ` · RPE ${s.rpe}`}
                      </p>
                      {s.topFault && <p className="truncate text-xs text-amber-400">{faultLabel(lang, s.topFault)}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        deleteSet(s.id);
                        setRemoved(s);
                      }}
                      className="rounded-full px-3 py-2 text-xs text-zinc-500 active:bg-zinc-800"
                      aria-label={t.ui.delete}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <button
            type="button"
            onClick={() => {
              if (confirm(t.ui.confirmClear)) clearHistory();
            }}
            className="mt-4 rounded-full bg-red-950/60 py-3 text-sm font-medium text-red-300"
          >
            {t.ui.clearAll}
          </button>
        </>
      )}

      {removed && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-zinc-800 p-3 shadow-lg motion-safe:animate-rise"
        >
          <p className="text-sm">{t.ui.deleted}</p>
          <button
            type="button"
            onClick={() => {
              addSet(removed);
              setRemoved(null);
            }}
            className="rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 active:scale-95"
          >
            {t.ui.undo}
          </button>
        </div>
      )}
    </main>
  );
}
