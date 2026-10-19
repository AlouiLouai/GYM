"use client";

import { useRef, useState } from "react";
import type { Framing } from "@/core/pose/framing";
import { EXERCISE_GROUPS } from "@/core/exercises/definitions";
import { primeSpeech } from "@/lib/speech";
import { useCanSpeak } from "@/lib/use-can-speak";
import { useWakeLock } from "@/lib/use-wake-lock";
import { SetSummaryPanel } from "./set-summary-panel";
import { useCoachSession } from "./use-coach-session";
import { usePoseTracker, type Facing } from "./use-pose-tracker";

const FRAMING_HINT: Record<Framing, string> = {
  "no-person": "Step into view so the camera can see you.",
  partial: "Step back until your whole body is in frame.",
  "full-body": "Great framing. You're ready.",
};

export default function PoseSession() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [facing, setFacing] = useState<Facing>("user");

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

  // The front camera is shown mirrored, like a mirror in the gym.
  const mirror = facing === "user";
  // object-contain (not cover): cropping would hide parts of the frame the pose model still sees,
  // so the framing hint could say "full body" while the lifter is cut off on screen.
  const mediaClass = `absolute inset-0 h-full w-full object-contain ${mirror ? "-scale-x-100" : ""}`;
  const running = status === "running";
  const reviewing = coach.review !== null;
  const warmingUp = running && coach.reps.length === 0 && stats.framing !== "full-body";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-black">
      <video ref={videoRef} className={mediaClass} playsInline muted autoPlay />
      <canvas ref={canvasRef} className={mediaClass} />

      {running && (
        <div className="absolute inset-x-0 top-0 flex flex-col gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-start justify-between gap-3">
            <p
              className={`rounded-full px-4 py-2 text-sm font-medium backdrop-blur ${
                stats.framing === "full-body"
                  ? "bg-lime-400/90 text-zinc-950"
                  : "bg-zinc-900/80 text-zinc-100"
              }`}
            >
              {warmingUp ? FRAMING_HINT[stats.framing] : coach.config.name}
            </p>
            <p className="rounded-full bg-zinc-900/80 px-3 py-2 font-mono text-xs text-zinc-300 backdrop-blur">
              {stats.fps} fps · {stats.delegate}
            </p>
          </div>

          <div className="flex items-end gap-4">
            <p className="text-8xl leading-none font-bold tabular-nums drop-shadow-lg" aria-label="Rep count">
              {coach.reps.length}
            </p>
            {coach.lastRep && (
              <p className="mb-2 rounded-full bg-zinc-900/80 px-3 py-1 text-sm backdrop-blur">
                Last rep: <strong>{coach.lastRep.score}</strong>/100
              </p>
            )}
          </div>

          {coach.debug && (
            <p className="w-fit rounded-xl bg-zinc-900/85 px-3 py-2 font-mono text-xs leading-5 text-zinc-200 backdrop-blur">
              {coach.config.signalLabel}: {coach.signal === null ? "–" : `${Math.round(coach.signal)}°`}
              <br />
              start {coach.config.rep.direction === "decreasing" ? "≥" : "≤"} {coach.config.rep.restThreshold}° · target{" "}
              {coach.config.rep.direction === "decreasing" ? "≤" : "≥"} {coach.config.rep.workThreshold}°
            </p>
          )}

          {stats.fps > 0 && stats.fps < 12 && (
            <p role="status" className="w-fit rounded-xl bg-amber-400/95 px-3 py-2 text-xs font-medium text-zinc-950">
              Low frame rate: tracking may miss fast reps. Close other apps and improve lighting.
            </p>
          )}
        </div>
      )}

      {running && coach.cue && !reviewing && (
        <p
          key={coach.cue.id}
          role="status"
          className={`absolute inset-x-4 bottom-28 rounded-2xl p-4 text-center text-lg font-semibold backdrop-blur ${
            coach.cue.tone === "good" ? "bg-lime-400/90 text-zinc-950" : "bg-amber-400/95 text-zinc-950"
          }`}
        >
          {coach.cue.text}
        </p>
      )}

      {!enabled && (
        // m-auto on the inner column (not justify-center on the scroller) centres short content but
        // keeps a tall list scrollable from its top. The bottom padding clears the control bar.
        <div className="absolute inset-0 flex flex-col overflow-y-auto p-6 pb-28 text-center">
          <div className="m-auto flex w-full max-w-md flex-col items-center gap-5">
            <h1 className="text-2xl font-semibold">Choose your exercise</h1>
            <div className="flex w-full flex-col gap-3">
              {EXERCISE_GROUPS.map(({ group, exercises }) => (
                <section key={group} aria-label={group}>
                  <h2 className="mb-1.5 text-xs font-medium tracking-wide text-zinc-500 uppercase">{group}</h2>
                  <div className="flex flex-wrap justify-center gap-2">
                    {exercises.map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => coach.selectExercise(ex.id)}
                        aria-pressed={coach.exerciseId === ex.id}
                        className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium active:scale-95 ${
                          coach.exerciseId === ex.id
                            ? "bg-lime-400 text-zinc-950"
                            : "bg-zinc-800/90 text-zinc-200 backdrop-blur"
                        }`}
                      >
                        {ex.name}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <p className="text-zinc-300">{coach.config.setupHint}</p>
            <p className="text-sm text-zinc-500">
              Beta: a form assistant, not a certified coach or medical advice. Video is processed on this
              device and never uploaded.
            </p>
          </div>
        </div>
      )}

      {status === "starting" && (
        <p className="absolute inset-x-0 top-1/2 text-center text-zinc-300">Starting camera…</p>
      )}

      {error && (
        <p
          role="alert"
          className="absolute inset-x-4 top-4 rounded-xl bg-red-950/90 p-4 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      {coach.review && (
        <SetSummaryPanel
          summary={coach.review}
          previous={coach.previousSet}
          setNumber={coach.setNumber}
          onNextSet={coach.resetSet}
        />
      )}

      {!reviewing && (
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {running && (
            <button
              type="button"
              onClick={coach.finishSet}
              disabled={coach.reps.length + coach.partials.length === 0}
              className="rounded-full bg-lime-400 px-6 py-3 font-semibold text-zinc-950 active:scale-95 disabled:opacity-40"
            >
              Finish set
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!enabled && coach.voice) primeSpeech();
              setEnabled((on) => !on);
            }}
            className={`rounded-full px-6 py-3 font-semibold active:scale-95 ${
              running ? "bg-zinc-800/90 text-zinc-100 backdrop-blur" : "bg-lime-400 text-zinc-950"
            }`}
          >
            {enabled ? "Stop" : "Start camera"}
          </button>
          <button
            type="button"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            className="rounded-full bg-zinc-800/90 px-5 py-3 text-sm font-medium text-zinc-100 backdrop-blur active:scale-95"
          >
            Flip camera
          </button>
          <button
            type="button"
            onClick={() => coach.setDebug(!coach.debug)}
            aria-pressed={coach.debug}
            className="rounded-full bg-zinc-800/90 px-5 py-3 text-sm font-medium text-zinc-100 backdrop-blur active:scale-95"
          >
            Debug {coach.debug ? "on" : "off"}
          </button>
          {canSpeak && (
            <button
              type="button"
              onClick={() => coach.setVoice(!coach.voice)}
              aria-pressed={coach.voice}
              className="rounded-full bg-zinc-800/90 px-5 py-3 text-sm font-medium text-zinc-100 backdrop-blur active:scale-95"
            >
              Voice {coach.voice ? "on" : "off"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
