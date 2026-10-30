"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { VOICE_MODES } from "@/core/coach/voice-policy";
import { useI18n } from "@/lib/i18n";
import { updateSettings, useSettings } from "@/lib/settings";
import { primeSpeech } from "@/lib/speech";
import { useCanSpeak } from "@/lib/use-can-speak";
import { useWakeLock } from "@/lib/use-wake-lock";
import { ExercisePicker } from "./exercise-picker";
import { GhostOverlay } from "./ghost-overlay";
import { SetSummaryPanel } from "./set-summary-panel";
import { useCoachSession } from "./use-coach-session";
import { usePoseTracker, type Facing } from "./use-pose-tracker";
import { formatClock, useRestTimer } from "./use-rest-timer";

const VOICE_ICON = {
  smart: "🧠",
  all: "🔊",
  reps: "🔢",
  chime: "🔔",
  off: "🔇",
} as const;

export default function PoseSession() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [facing, setFacing] = useState<Facing>("user");

  const { lang, t } = useI18n();
  const settings = useSettings();
  const coach = useCoachSession();
  const canSpeak = useCanSpeak();
  const { status, error, stats } = usePoseTracker({
    enabled,
    facing,
    videoRef,
    canvasRef,
    onFrame: coach.onFrame,
  });
  useWakeLock(enabled);
  // Hands-free finish: the same countdown hook as the rest timer, firing finishSet at zero.
  const autoLeft = useRestTimer(coach.autoFinishAt, coach.finishSet);

  // The front camera is shown mirrored, like a mirror in the gym.
  const mirror = facing === "user";
  // object-contain (not cover): cropping would hide parts of the frame the pose model still sees,
  // so the framing hint could say "full body" while the lifter is cut off on screen.
  const mediaClass = `absolute inset-0 h-full w-full object-contain ${mirror ? "-scale-x-100" : ""}`;
  const running = status === "running";
  const reviewing = coach.review !== null;
  const started = coach.isHold ? coach.hold.phase !== "waiting" : coach.reps.length + coach.partials.length > 0;
  const warmingUp = running && !started && stats.framing !== "full-body";
  // Line-up outline until the first rep (or the hold) starts.
  const showGhost = running && !reviewing && !started;
  const holdSec = Math.floor(coach.hold.ms / 1000);
  const exercise = t.exercises[coach.exerciseId];
  const mode = settings.voiceMode;
  const nextMode = VOICE_MODES[(VOICE_MODES.indexOf(mode) + 1) % VOICE_MODES.length];
  const pill = "rounded-full bg-zinc-800/90 px-5 py-3 text-sm font-medium text-zinc-100 backdrop-blur active:scale-95";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-black">
      <video ref={videoRef} className={mediaClass} playsInline muted autoPlay />
      <canvas ref={canvasRef} className={mediaClass} />
      {showGhost && (
        <GhostOverlay
          exercise={coach.exerciseId}
          inFrame={stats.framing === "full-body"}
          label={coach.isHold ? t.ui.getInPosition : t.ui.matchOutline}
        />
      )}

      {running && (
        <div className="absolute inset-x-0 top-0 flex flex-col gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-start justify-between gap-3">
            <p
              className={`rounded-full px-4 py-2 text-sm font-medium backdrop-blur ${
                stats.framing === "full-body" ? "bg-lime-400/90 text-zinc-950" : "bg-zinc-900/80 text-zinc-100"
              }`}
            >
              {warmingUp ? t.framing[stats.framing] : exercise.name}
            </p>
            <p
              className="rounded-full bg-zinc-900/80 px-3 py-2 font-mono text-xs text-zinc-300 backdrop-blur"
              dir="ltr"
            >
              {stats.fps} fps · {stats.delegate}
            </p>
          </div>

          {coach.isHold ? (
            <div className="flex items-end gap-4">
              <p
                className={`text-8xl leading-none font-bold tabular-nums drop-shadow-lg ${
                  coach.hold.phase === "slipping" ? "text-amber-400" : ""
                }`}
                role="timer"
                aria-label={t.ui.holdTime}
                dir="ltr"
              >
                {formatClock(holdSec)}
              </p>
            </div>
          ) : (
            <div className="flex items-end gap-4">
              <p
                key={coach.reps.length}
                className="motion-safe:animate-pop text-8xl leading-none font-bold tabular-nums drop-shadow-lg"
                aria-label={t.ui.repCount}
                aria-live="polite"
                dir="ltr"
              >
                {coach.reps.length}
                {coach.target && <span className="text-4xl text-zinc-400">/{coach.target}</span>}
              </p>
              {coach.lastRep && (
                <p className="mb-2 rounded-full bg-zinc-900/80 px-3 py-1 text-sm backdrop-blur">
                  {t.ui.lastRep}: <strong dir="ltr">{coach.lastRep.score}</strong>/100
                </p>
              )}
            </div>
          )}

          {settings.debug && (
            <p
              className="w-fit rounded-xl bg-zinc-900/85 px-3 py-2 font-mono text-xs leading-5 text-zinc-200 backdrop-blur"
              dir="ltr"
            >
              {coach.config.signalLabel}: {coach.signal === null ? "–" : `${Math.round(coach.signal)}°`}
              <br />
              start {coach.config.rep.direction === "decreasing" ? "≥" : "≤"} {coach.config.rep.restThreshold}° · target{" "}
              {coach.config.rep.direction === "decreasing" ? "≤" : "≥"} {coach.config.rep.workThreshold}°
            </p>
          )}

          {stats.fps > 0 && stats.fps < 12 && (
            <p role="status" className="w-fit rounded-xl bg-amber-400/95 px-3 py-2 text-xs font-medium text-zinc-950">
              {t.ui.lowFps}
            </p>
          )}
        </div>
      )}

      {running && !reviewing && autoLeft !== null && autoLeft <= 5 && (
        <div
          role="status"
          className="absolute inset-x-4 bottom-44 flex items-center justify-between gap-3 rounded-2xl bg-zinc-900/90 p-3 backdrop-blur"
        >
          <p className="text-sm font-medium">⏱ {t.ui.autoFinishIn(autoLeft)}</p>
          <button
            type="button"
            onClick={coach.cancelAutoFinish}
            className="rounded-full bg-zinc-700 px-4 py-2 text-sm font-semibold active:scale-95"
          >
            {t.ui.keepGoing}
          </button>
        </div>
      )}

      {running && coach.cue && !reviewing && (
        <p
          key={coach.cue.id}
          role="status"
          className={`absolute inset-x-4 bottom-28 rounded-2xl p-4 motion-safe:animate-rise text-center text-lg font-semibold backdrop-blur ${
            coach.cue.tone === "good" ? "bg-lime-400/90 text-zinc-950" : "bg-amber-400/95 text-zinc-950"
          }`}
        >
          {coach.cue.text}
        </p>
      )}

      {!enabled && (
        // m-auto on the inner column (not justify-center on the scroller) centres short content but
        // keeps a tall list scrollable from its top. The bottom padding clears the control bar.
        <div className="absolute inset-0 flex flex-col overflow-y-auto p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-28 text-center">
          <Link href="/" className="w-fit rounded-full bg-zinc-800/90 px-4 py-2 text-sm font-medium text-zinc-200">
            {lang === "en" ? "←" : "→"} {t.ui.back}
          </Link>
          <div className="m-auto flex w-full max-w-md flex-col items-center gap-5 pt-4">
            <h1 className="text-2xl font-semibold">{t.ui.chooseExercise}</h1>
            <ExercisePicker
              selected={coach.exerciseId}
              onSelect={coach.selectExercise}
              target={coach.target}
              onTarget={coach.setTarget}
            />
            <p className="text-sm text-zinc-500">{t.ui.beta}</p>
          </div>
        </div>
      )}

      {status === "starting" && (
        <p className="absolute inset-x-0 top-1/2 text-center text-zinc-300">{t.ui.startingCamera}</p>
      )}

      {error && (
        <p role="alert" className="absolute inset-x-4 top-4 rounded-xl bg-red-950/90 p-4 text-sm text-red-200">
          {t.ui.cameraErrors[error]}
        </p>
      )}

      {coach.review && (
        <SetSummaryPanel
          summary={coach.review}
          previous={coach.previousSet}
          setNumber={coach.setNumber}
          recordId={coach.recordId}
          restEndsAt={coach.restEndsAt}
          onAddRest={coach.addRest}
          onSkipRest={coach.skipRest}
          onNextSet={coach.resetSet}
        />
      )}

      {!reviewing && (
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {running && (
            <button
              type="button"
              onClick={coach.finishSet}
              disabled={coach.isHold ? coach.hold.ms < 1000 : coach.reps.length + coach.partials.length === 0}
              className="rounded-full bg-lime-400 px-6 py-3 font-semibold text-zinc-950 active:scale-95 disabled:opacity-40"
            >
              {t.ui.finishSet}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!enabled) {
                const talks = mode === "smart" || mode === "all" || mode === "reps";
                primeSpeech(talks ? t.voice.ready : null, {
                  lang,
                  voiceName: settings.voiceName,
                });
              }
              setEnabled((on) => !on);
            }}
            className={`rounded-full px-6 py-3 font-semibold active:scale-95 ${
              running ? "bg-zinc-800/90 text-zinc-100 backdrop-blur" : "bg-lime-400 text-zinc-950"
            }`}
          >
            {enabled ? t.ui.stop : t.ui.startCamera}
          </button>
          <button
            type="button"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            className={pill}
          >
            {t.ui.flip}
          </button>
          {canSpeak && (
            <button
              type="button"
              onClick={() => {
                updateSettings({ voiceMode: nextMode });
                primeSpeech(null, { lang });
              }}
              className={pill}
              aria-label={`${t.ui.voiceMode}: ${t.ui.voiceModes[mode][0]}`}
            >
              {VOICE_ICON[mode]} {t.ui.voiceModes[mode][0]}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
