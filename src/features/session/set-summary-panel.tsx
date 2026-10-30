"use client";

import { useEffect, useRef, useState } from "react";
import { compareSets, type SetSummary } from "@/core/engine/set-summary";
import { currentStreak, estimateOneRepMax, formatWeight, fromKg, newPr, toKg } from "@/core/history/stats";
import { faultLabel, langInfo } from "@/core/i18n";
import { shareCard } from "@/features/share/share-card";
import { lastSetOf, updateSet, useHistory } from "@/lib/history";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { fanfare, speak } from "@/lib/speech";
import { CoachNote } from "./coach-note";
import { PlateCalculator } from "./plate-calculator";
import { formatClock, useRestTimer } from "./use-rest-timer";

function Delta({ value, unit = "", invert = false }: { value: number; unit?: string; invert?: boolean }) {
  const rounded = Math.round(value);
  if (rounded === 0) return <span className="text-zinc-500">±0{unit}</span>;
  const good = invert ? rounded < 0 : rounded > 0;
  return (
    <span className={good ? "text-lime-400" : "text-amber-400"} dir="ltr">
      {rounded > 0 ? "+" : ""}
      {rounded}
      {unit}
    </span>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-zinc-900 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-xl font-semibold" dir="ltr">
        {value}
      </p>
      {delta && <p className="text-xs">{delta}</p>}
    </div>
  );
}

const RPE_OPTIONS = [6, 7, 8, 9, 10];
const PR_ANNOUNCE_DELAY_MS = 1200;

export function SetSummaryPanel({
  summary,
  previous,
  setNumber,
  recordId,
  restEndsAt,
  onAddRest,
  onSkipRest,
  onNextSet,
}: {
  summary: SetSummary;
  previous: SetSummary | null;
  setNumber: number;
  recordId: string | null;
  restEndsAt: number | null;
  onAddRest: (sec: number) => void;
  onSkipRest: () => void;
  onNextSet: () => void;
}) {
  const { lang, t } = useI18n();
  const settings = useSettings();
  const history = useHistory();
  const record = history.find((r) => r.id === recordId) ?? null;
  const before = lastSetOf(history, summary.exercise, recordId ?? undefined);
  const pr = record
    ? newPr(
        history.filter((r) => r.at < record.at),
        record,
      )
    : null;
  const unit = settings.unit;
  const name = t.exercises[summary.exercise].name;

  const isHold = summary.holdMs !== undefined;
  const holdSec = Math.round((summary.holdMs ?? 0) / 1000);
  const diff = previous ? compareSets(previous, summary) : null;
  const { fatigue } = summary;

  // The weight field is text while typing ("2", "22", "22.5"), and saved as kg when it parses.
  const [weightText, setWeightText] = useState(() => (record?.weightKg ? String(fromKg(record.weightKg, unit)) : ""));
  const setWeight = (text: string) => {
    setWeightText(text);
    if (!recordId) return;
    const value = Number(text.replace(",", "."));
    updateSet(recordId, {
      weightKg: text.trim() && value > 0 ? toKg(value, unit) : null,
    });
  };
  const step = unit === "kg" ? 2.5 : 5;
  const bump = (dir: 1 | -1) => {
    const current = Number(weightText.replace(",", ".")) || 0;
    setWeight(String(Math.max(0, current + dir * step)));
  };

  // Celebrate a PR once, after the lifter has stopped typing the weight.
  const announced = useRef<string | null>(null);
  useEffect(() => {
    if (!pr || announced.current === recordId) return;
    const id = setTimeout(() => {
      announced.current = recordId;
      if (settings.voiceMode === "off") return;
      fanfare();
      if (settings.voiceMode !== "chime") {
        setTimeout(
          () =>
            speak(t.voice.newPr, {
              lang,
              voiceName: settings.voiceName,
              priority: 2,
            }),
          500,
        );
      }
      navigator.vibrate?.([80, 60, 80]);
    }, PR_ANNOUNCE_DELAY_MS);
    return () => clearTimeout(id);
  }, [pr, recordId, settings.voiceMode, settings.voiceName, lang, t]);

  const rest = useRestTimer(restEndsAt, () => {
    navigator.vibrate?.([200, 100, 200]);
    if (settings.voiceMode === "off") return;
    fanfare();
    if (settings.voiceMode !== "chime")
      speak(t.voice.restOver, {
        lang,
        voiceName: settings.voiceName,
        priority: 2,
      });
  });

  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const onShare = async () => {
    const result = await shareCard({
      t,
      rtl: langInfo(lang).dir === "rtl",
      exercise: name,
      reps: summary.reps,
      score: summary.avgScore,
      weight: record?.weightKg ? formatWeight(record.weightKg, unit) : null,
      // The set was just finished, so its time stands in for "now" (Date.now is off-limits in render code).
      streak: currentStreak(history, record?.at ?? 0),
      pr: pr !== null,
      headline: isHold ? { value: formatClock(holdSec), label: t.ui.holdTime } : undefined,
    });
    if (result === "saved") setShareStatus(t.ui.shared);
  };

  return (
    <div className="absolute inset-x-0 bottom-0 max-h-[88%] overflow-y-auto rounded-t-3xl bg-zinc-950/95 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur">
      {rest !== null && (
        <div
          className={`mb-4 flex items-center justify-between gap-3 rounded-2xl p-3 ${
            rest === 0 ? "bg-lime-400 text-zinc-950" : "bg-zinc-900"
          }`}
          role="timer"
        >
          <div>
            <p className="text-xs opacity-70">{t.ui.rest}</p>
            <p className="text-3xl font-bold tabular-nums" dir="ltr">
              {rest === 0 ? t.ui.restDone : formatClock(rest)}
            </p>
          </div>
          {rest > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onAddRest(30)}
                className="rounded-full bg-zinc-800 px-3 py-2 text-sm font-medium active:scale-95"
                dir="ltr"
              >
                +30s
              </button>
              <button
                type="button"
                onClick={onSkipRest}
                className="rounded-full bg-zinc-800 px-3 py-2 text-sm font-medium active:scale-95"
              >
                {t.ui.skip}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t.ui.setTitle(setNumber, name)}</h2>
        {pr && (
          <span className="motion-safe:animate-bounce rounded-full bg-lime-400 px-3 py-1 text-sm font-bold text-zinc-950">
            🏆 {t.ui.newPr}
          </span>
        )}
      </div>

      {record && (
        <div className="mt-3 rounded-xl bg-zinc-900 p-3">
          {!isHold && (
            <>
              <label className="text-xs text-zinc-500" htmlFor="set-weight">
                {t.ui.weight} ({unit})
              </label>
              <div className="mt-1 flex items-center gap-2" dir="ltr">
                <button
                  type="button"
                  onClick={() => bump(-1)}
                  className="size-11 rounded-full bg-zinc-800 text-xl font-bold active:scale-95"
                  aria-label={`-${step}`}
                >
                  −
                </button>
                <input
                  id="set-weight"
                  inputMode="decimal"
                  value={weightText}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={t.ui.bodyweight}
                  className="h-11 min-w-0 flex-1 rounded-xl bg-zinc-800 px-3 text-center text-xl font-semibold outline-none focus:ring-2 focus:ring-lime-400"
                />
                <button
                  type="button"
                  onClick={() => bump(1)}
                  className="size-11 rounded-full bg-zinc-800 text-xl font-bold active:scale-95"
                  aria-label={`+${step}`}
                >
                  +
                </button>
              </div>
              {before?.weightKg && (
                <p className="mt-1 text-xs text-zinc-500">
                  {t.ui.lastTime(`${formatWeight(before.weightKg, unit)} × ${before.reps}`)}
                </p>
              )}
              <PlateCalculator weightText={weightText} unit={unit} />
            </>
          )}

          <p className={`${isHold ? "" : "mt-3 "}text-xs text-zinc-500`}>
            {t.ui.rpe} · {t.ui.rpeHint}
          </p>
          <div className="mt-1 flex gap-2" dir="ltr">
            {RPE_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={record.rpe === v}
                onClick={() => updateSet(record.id, { rpe: record.rpe === v ? null : v })}
                className={`h-10 flex-1 rounded-full text-sm font-semibold active:scale-95 ${
                  record.rpe === v ? "bg-lime-400 text-zinc-950" : "bg-zinc-800"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {isHold ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat
            label={t.ui.holdTime}
            value={formatClock(holdSec)}
            delta={previous?.holdMs !== undefined && <Delta value={holdSec - previous.holdMs / 1000} unit="s" />}
          />
          <Stat
            label={t.ui.formScore}
            value={`${summary.avgScore}/100`}
            delta={diff && <Delta value={diff.scoreDelta} />}
          />
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label={t.ui.reps} value={String(summary.reps)} delta={diff && <Delta value={diff.repsDelta} />} />
          <Stat
            label={t.ui.formScore}
            value={`${summary.avgScore}/100`}
            delta={diff && <Delta value={diff.scoreDelta} />}
          />
          <Stat
            label={t.ui.rom}
            value={`${summary.avgRangeOfMotion}°`}
            delta={diff && <Delta value={diff.romDelta} unit="°" />}
          />
          <Stat
            label={t.ui.lowering}
            value={`${(summary.avgEccentricMs / 1000).toFixed(1)}s`}
            delta={diff && <Delta value={diff.eccentricDeltaMs / 1000} unit="s" />}
          />
          <Stat label={t.ui.lifting} value={`${(summary.avgConcentricMs / 1000).toFixed(1)}s`} />
          {record?.weightKg && summary.reps > 0 && (
            <Stat label={t.ui.est1rm} value={formatWeight(estimateOneRepMax(record.weightKg, summary.reps), unit)} />
          )}
        </div>
      )}

      {previous && <p className="mt-2 text-xs text-zinc-500">{t.ui.comparedPrev}</p>}

      {!isHold && <CoachNote key={setNumber} summary={summary} previous={previous} />}

      <ul className="mt-4 space-y-2 text-sm text-zinc-300">
        {summary.partialReps > 0 && <li>{t.ui.partialNotCounted(summary.partialReps)}</li>}
        {isHold ? (
          summary.topFault ? (
            <li>{faultLabel(lang, summary.topFault.id)}</li>
          ) : (
            <li>{t.ui.noIssues}</li>
          )
        ) : summary.topFault ? (
          <li>{t.ui.mostCommon(faultLabel(lang, summary.topFault.id), summary.topFault.count, summary.reps)}</li>
        ) : (
          summary.reps > 0 && <li>{t.ui.noIssues}</li>
        )}
        {fatigue && fatigue.scoreChange < -5 && <li>{t.ui.formDropped(Math.abs(Math.round(fatigue.scoreChange)))}</li>}
        {fatigue && fatigue.romChangePct < -8 && <li>{t.ui.romShrank(Math.abs(Math.round(fatigue.romChangePct)))}</li>}
        {fatigue && fatigue.eccentricChangePct < -25 && <li>{t.ui.rushed}</li>}
      </ul>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onShare}
          className="rounded-full bg-zinc-800 px-5 py-3 font-semibold active:scale-95"
        >
          {t.ui.share}
        </button>
        <button
          type="button"
          onClick={onNextSet}
          className="flex-1 rounded-full bg-lime-400 py-3 font-semibold text-zinc-950 active:scale-95"
        >
          {t.ui.nextSet}
        </button>
      </div>
      {shareStatus && <p className="mt-2 text-center text-xs text-zinc-500">{shareStatus}</p>}
    </div>
  );
}
