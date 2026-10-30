"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VoicePolicy, type VoiceIntent, type VoiceLine } from "@/core/coach/voice-policy";
import { ExerciseEngine } from "@/core/engine/exercise-engine";
import { HoldEngine, type HoldPhase } from "@/core/hold/hold-engine";
import { summarizeSet, type SetSummary } from "@/core/engine/set-summary";
import type { ExerciseId, PartialRepResult, PoseFrame, RepResult } from "@/core/engine/types";
import { EXERCISES } from "@/core/exercises/definitions";
import type { SetRecord } from "@/core/history/stats";
import { faultCue, messages } from "@/core/i18n";
import { addSet, getHistory, lastSetOf } from "@/lib/history";
import { getSettings, markRecent, useSettings } from "@/lib/settings";
import { beep, buzz, speak, stopSpeaking } from "@/lib/speech";

export interface Cue {
  id: number;
  text: string;
  tone: "good" | "warn";
}

const CUE_VISIBLE_MS = 3500;
const GAUGE_INTERVAL_MS = 250;

/**
 * Glue between the pose stream and the UI: runs the exercise engine, keeps the
 * current set's reps, produces cues (on screen + voice), builds set summaries and
 * saves each finished set to the history.
 */
export function useCoachSession() {
  const settings = useSettings();
  // undefined = reopen the last exercise used (from settings, so it survives reloads and stays hydration-safe).
  const [exerciseOverride, setExerciseId] = useState<ExerciseId | undefined>(undefined);
  const exerciseId = exerciseOverride ?? settings.recent[0] ?? "squat";
  const config = EXERCISES[exerciseId];
  const engine = useMemo(() => new ExerciseEngine(config), [config]);
  const holdEngine = useMemo(() => (config.hold ? new HoldEngine(config) : null), [config]);
  // undefined = follow the default from settings (hydration-safe); a pick on the session screen overrides it.
  const [targetOverride, setTarget] = useState<number | null | undefined>(undefined);
  const target = targetOverride === undefined ? settings.targetReps : targetOverride;

  const [reps, setReps] = useState<RepResult[]>([]);
  const [partials, setPartials] = useState<PartialRepResult[]>([]);
  const [cue, setCue] = useState<Cue | null>(null);
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [review, setReview] = useState<{ summary: SetSummary; recordId: string } | null>(null);
  const [signal, setSignal] = useState<number | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  /** When the set ends by itself if no further rep comes (hands-free finish). */
  const [autoFinishAt, setAutoFinishAt] = useState<number | null>(null);
  /** Timed holds: the phase and the time held, refreshed a few times a second for the clock. */
  const [hold, setHold] = useState<{ phase: HoldPhase; ms: number }>({ phase: "waiting", ms: 0 });
  /** Latest finishSet, so the frame loop can end a hold that ended by itself. */
  const finishRef = useRef<() => void>(() => {});
  const lastHoldUiAt = useRef(0);

  const [policy] = useState(() => new VoicePolicy(settings.voiceMode, target));
  const cueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cueId = useRef(0);
  const lastGaugeAt = useRef(0);
  // The frame loop reads these, so it must not re-subscribe on every settings change.
  const live = useRef({ settings, exerciseId });
  useEffect(() => {
    live.current = { settings, exerciseId };
  });

  useEffect(() => {
    policy.reset(settings.voiceMode, target);
    if (settings.voiceMode === "off") stopSpeaking();
  }, [policy, settings.voiceMode, target]);
  useEffect(() => () => {
    if (cueTimer.current) clearTimeout(cueTimer.current);
    stopSpeaking();
  }, []);

  const say = useCallback((line: VoiceLine | null | undefined) => {
    if (!line) return;
    const { settings: s, exerciseId: ex } = live.current;
    const t = messages(s.lang);
    if (line.intents.some((i) => i.type === "buzz")) return buzz();
    if (line.intents.some((i) => i.type === "beep")) return beep();
    const words = (i: VoiceIntent): string => {
      switch (i.type) {
        case "count":
          return t.voice.count(i.n);
        case "fault":
          return faultCue(s.lang, ex, i.id).say;
        case "beep":
        case "buzz":
          return "";
        default:
          return t.voice[i.type];
      }
    };
    const text = line.intents.map(words).filter(Boolean).join(s.lang === "en" ? ". " : "، ");
    speak(text, { lang: s.lang, voiceName: s.voiceName, priority: line.priority });
  }, []);

  /** Hold coaching respects the voice mode: talk in smart/all/reps, beep in chime, nothing when off. */
  const sayHold = useCallback((text: string, priority: number, faultLine = false) => {
    const { voiceMode, lang, voiceName } = live.current.settings;
    if (voiceMode === "off") return;
    if (voiceMode === "chime") return faultLine ? buzz() : beep();
    if (faultLine && voiceMode === "reps") return;
    speak(text, { lang, voiceName, priority });
  }, []);

  const showCue = useCallback((text: string, tone: Cue["tone"]) => {
    setCue({ id: ++cueId.current, text, tone });
    if (cueTimer.current) clearTimeout(cueTimer.current);
    cueTimer.current = setTimeout(() => setCue(null), CUE_VISIBLE_MS);
  }, []);

  const onFrame = useCallback(
    (frame: PoseFrame | null, t: number) => {
      if (review) return; // set is over; ignore movement until the next set starts
      if (holdEngine) {
        const { lang, haptics } = live.current.settings;
        const m = messages(lang);
        const ex = live.current.exerciseId;
        for (const event of holdEngine.process(frame, t)) {
          switch (event.type) {
            case "start":
              showCue(m.voice.holdGo, "good");
              sayHold(m.voice.holdGo, 1);
              if (haptics) navigator.vibrate?.(60);
              break;
            case "milestone":
              sayHold(m.voice.seconds(event.sec), 1);
              if (haptics) navigator.vibrate?.(35);
              break;
            case "slipping":
              showCue(m.ui.holdOnLabel, "warn");
              sayHold(m.voice.holdOn, 2);
              break;
            case "live":
              showCue(faultCue(lang, ex, event.fault.id).show, "warn");
              sayHold(faultCue(lang, ex, event.fault.id).say, 1, true);
              break;
            case "end":
              finishRef.current();
              break;
          }
        }
        if (t - lastHoldUiAt.current > GAUGE_INTERVAL_MS) {
          lastHoldUiAt.current = t;
          setHold({ phase: holdEngine.state, ms: holdEngine.heldMs(t) });
        }
        return;
      }
      if (!frame) {
        engine.markLost(t);
        return;
      }
      const { lang, debug, haptics, autoFinishSec } = live.current.settings;
      const ex = live.current.exerciseId;
      const m = messages(lang);
      const { signal: value, events } = engine.process(frame);
      if (debug && t - lastGaugeAt.current > GAUGE_INTERVAL_MS) {
        lastGaugeAt.current = t;
        setSignal(value);
      }
      const voice = policy;
      // Any rep attempt pushes the hands-free finish back.
      if (autoFinishSec > 0 && events.some((e) => e.type !== "live")) {
        setAutoFinishAt(Date.now() + autoFinishSec * 1000);
      }
      for (const event of events) {
        if (event.type === "live") {
          // Coach the fault the moment it happens, not after the rep.
          showCue(faultCue(lang, ex, event.fault.id).show, "warn");
          say(voice.live(event.fault.id));
        } else if (event.type === "rep") {
          const { rep } = event;
          setReps((prev) => [...prev, rep]);
          if (haptics) navigator.vibrate?.(rep.faults.length ? [40, 60, 40] : 35);
          const late = rep.faults.find((f) => !f.announced);
          if (late) showCue(faultCue(lang, ex, late.id).show, "warn");
          else if (rep.faults.length > 0) showCue(m.ui.rep(rep.index), "warn");
          else showCue(m.ui.goodRep(rep.index), "good");
          say(
            voice.rep(
              rep.index,
              rep.faults.map((f) => f.id),
              rep.faults.filter((f) => !f.announced).map((f) => f.id),
            ),
          );
        } else {
          setPartials((prev) => [...prev, event.rep]);
          if (!event.rep.announced) showCue(faultCue(lang, ex, "depth").show, "warn");
          say(voice.partial(event.rep.announced));
        }
      }
    },
    [engine, holdEngine, review, policy, showCue, say, sayHold],
  );

  const clearSet = useCallback(() => {
    setReps([]);
    setPartials([]);
    setCue(null);
    setReview(null);
    setRestEndsAt(null);
    setAutoFinishAt(null);
    setHold({ phase: "waiting", ms: 0 });
    policy.reset();
  }, [policy]);

  const resetSet = useCallback(() => {
    engine.reset();
    holdEngine?.reset();
    clearSet();
  }, [engine, holdEngine, clearSet]);

  const selectExercise = useCallback(
    (id: ExerciseId) => {
      setExerciseId(id);
      markRecent(id);
      clearSet();
    },
    [clearSet],
  );

  const finishSet = useCallback(() => {
    let summary: SetSummary;
    if (holdEngine) {
      const heldMs = holdEngine.finish(performance.now());
      if (heldMs < 1000) return;
      summary = holdEngine.summary(heldMs);
    } else {
      if (reps.length === 0 && partials.length === 0) return;
      summary = summarizeSet(exerciseId, reps, partials);
    }
    // Lifters usually repeat the same weight, so carry the last one forward; it's editable in the summary.
    const previous = lastSetOf(getHistory(), exerciseId);
    const record: SetRecord = {
      id: crypto.randomUUID(),
      at: Date.now(),
      exercise: exerciseId,
      reps: summary.reps,
      partialReps: summary.partialReps,
      avgScore: summary.avgScore,
      weightKg: previous?.weightKg ?? null,
      rpe: null,
      topFault: summary.topFault?.id ?? null,
      ...(summary.holdMs !== undefined && { holdSec: Math.round(summary.holdMs / 1000) }),
    };
    addSet(record);
    markRecent(exerciseId);
    setSets((prev) => [...prev, summary]);
    setReview({ summary, recordId: record.id });
    setAutoFinishAt(null);
    setCue(null);
    stopSpeaking();
    const { restSec } = getSettings();
    if (restSec > 0) setRestEndsAt(Date.now() + restSec * 1000);
  }, [exerciseId, reps, partials, holdEngine]);

  useEffect(() => {
    finishRef.current = finishSet;
  });

  const addRest = useCallback((sec: number) => {
    setRestEndsAt((at) => (at === null ? null : Math.max(at, Date.now()) + sec * 1000));
  }, []);
  const skipRest = useCallback(() => setRestEndsAt(null), []);
  /** "Keep going": the lifter is resting mid-set on purpose, so don't end it yet. */
  const cancelAutoFinish = useCallback(() => setAutoFinishAt(null), []);

  /** The most recent earlier set of the same exercise, to measure improvement against. */
  const previousSet = useMemo(() => {
    if (!review) return null;
    const earlier = sets.slice(0, sets.lastIndexOf(review.summary));
    return earlier.findLast((s) => s.exercise === review.summary.exercise) ?? null;
  }, [review, sets]);

  return {
    config,
    isHold: holdEngine !== null,
    hold,
    exerciseId,
    selectExercise,
    target,
    setTarget,
    reps,
    partials,
    lastRep: reps.at(-1) ?? null,
    cue,
    signal,
    onFrame,
    finishSet,
    resetSet,
    review: review?.summary ?? null,
    recordId: review?.recordId ?? null,
    previousSet,
    setNumber: sets.length + (review ? 0 : 1),
    restEndsAt,
    addRest,
    autoFinishAt,
    cancelAutoFinish,
    skipRest,
  };
}
