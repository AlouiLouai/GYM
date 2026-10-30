"use client";

import { useState } from "react";
import { fromKg, weeklyStats, type SetRecord, type Unit, type WeekStats } from "@/core/history/stats";
import { formatClock } from "@/features/session/use-rest-timer";
import { useI18n } from "@/lib/i18n";

type Metric = "sets" | "reps" | "volume" | "hold";
const WEEKS = 8;

/** Sets, reps, volume or hold time per week for the last 8 weeks; tap a bar to read it. */
export function WeeklyChart({
  history,
  now,
  unit,
  locale,
}: {
  history: readonly SetRecord[];
  now: number;
  unit: Unit;
  locale: string;
}) {
  const { t } = useI18n();
  const [metric, setMetric] = useState<Metric>("sets");
  const weeks = weeklyStats(history, WEEKS, now);
  const [selected, setSelected] = useState(WEEKS - 1);

  const value = (w: WeekStats) =>
    metric === "sets"
      ? w.sets
      : metric === "reps"
        ? w.reps
        : metric === "volume"
          ? fromKg(w.volumeKg, unit)
          : w.holdSec;
  const format = (v: number) =>
    metric === "volume"
      ? `${Math.round(v).toLocaleString(locale)} ${unit}`
      : metric === "hold"
        ? formatClock(v)
        : String(v);
  const values = weeks.map(value);
  const max = Math.max(...values, 1);

  const metrics: { id: Metric; label: string; show: boolean }[] = [
    { id: "sets", label: t.ui.metricSets, show: true },
    { id: "reps", label: t.ui.metricReps, show: true },
    { id: "volume", label: t.ui.metricVolume, show: weeks.some((w) => w.volumeKg > 0) },
    { id: "hold", label: t.ui.metricHold, show: weeks.some((w) => w.holdSec > 0) },
  ];

  const thisWeek = values[WEEKS - 1];
  const lastWeek = values[WEEKS - 2];
  const change = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  const weekLabel = (key: string, opts: Intl.DateTimeFormatOptions) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, opts).format(new Date(y, m - 1, d));
  };

  return (
    <section className="rounded-2xl bg-zinc-900 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">📈 {t.ui.weeklyProgress}</h2>
        {change !== null && (
          <p className={`text-xs font-medium ${change >= 0 ? "text-lime-400" : "text-zinc-400"}`} dir="ltr">
            {t.ui.vsLastWeek(change)}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup">
        {metrics
          .filter((m) => m.show)
          .map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={metric === m.id}
              onClick={() => setMetric(m.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium active:scale-95 ${
                metric === m.id ? "bg-lime-400 text-zinc-950" : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {m.label}
            </button>
          ))}
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        {t.ui.weekOf(weekLabel(weeks[selected].week, { day: "numeric", month: "short" }))}
      </p>
      <p className="text-2xl font-bold tabular-nums" dir="ltr">
        {format(values[selected])}
      </p>

      {/* Bars sit on one baseline; each column is a full-height tap target. Oldest week on the left. */}
      <div className="mt-2 flex h-32 items-end gap-1 border-b border-zinc-700" dir="ltr">
        {weeks.map((w, i) => (
          <button
            key={w.week}
            type="button"
            onClick={() => setSelected(i)}
            aria-label={`${t.ui.weekOf(weekLabel(w.week, { day: "numeric", month: "long" }))}: ${format(values[i])}`}
            aria-pressed={selected === i}
            className="flex h-full flex-1 items-end"
          >
            <span
              className={`block w-full rounded-t transition-[height] duration-300 ${
                selected === i ? "bg-lime-400" : i === WEEKS - 1 ? "bg-lime-400/70" : "bg-lime-400/35"
              }`}
              style={{ height: values[i] > 0 ? `${Math.max(3, (values[i] / max) * 100)}%` : "0" }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-center text-[10px] text-zinc-500" dir="ltr">
        {weeks.map((w, i) => (
          <span key={w.week} className={`flex-1 ${selected === i ? "font-semibold text-zinc-200" : ""}`}>
            {weekLabel(w.week, { day: "numeric", month: "numeric" })}
          </span>
        ))}
      </div>
    </section>
  );
}
