"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExerciseEngine } from "@/core/engine/exercise-engine";
import { summarizeSet, type SetSummary } from "@/core/engine/set-summary";
import type { ExerciseId, PartialRepResult, PoseFrame, RepResult } from "@/core/engine/types";
import { EXERCISES } from "@/core/exercises/definitions";
import { speak, stopSpeaking } from "@/lib/speech";

export interface Cue {
  id: number;
  text: string;
  tone: "good" | "warn";
}

const CUE_VISIBLE_MS = 3500;
/** Minimum gap between spoken cues; a new one would just cut the previous off mid-word. */
const VOICE_GAP_MS = 1200;
const GAUGE_INTERVAL_MS = 250;

/**
 * Glue between the pose stream and the UI: runs the exercise engine, keeps the
 * current set's reps, produces cues (on screen + voice) and builds set summaries.
 * Everything lives in memory only; nothing is persisted.
 */
export function useCoachSession() {
  const [exerciseId, setExerciseId] = useState<ExerciseId>("squat");
  const config = EXERCISES[exerciseId];
  const engine = useMemo(() => new ExerciseEngine(config), [config]);

  const [reps, setReps] = useState<RepResult[]>([]);
  const [partials, setPartials] = useState<PartialRepResult[]>([]);
  const [cue, setCue] = useState<Cue | null>(null);
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [review, setReview] = useState<SetSummary | null>(null);
  const [voice, setVoice] = useState(true);
  const [debug, setDebug] = useState(false);
  const [signal, setSignal] = useState<number | null>(null);

  const voiceRef = useRef(voice);
  const cueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cueId = useRef(0);
  const lastSpokenAt = useRef(0);
  const lastGaugeAt = useRef(0);
  const debugRef = useRef(debug);
  useEffect(() => {
    debugRef.current = debug;
  }, [debug]);
  useEffect(() => {
    voiceRef.current = voice;
    if (!voice) stopSpeaking();
  }, [voice]);
  useEffect(() => () => {
    if (cueTimer.current) clearTimeout(cueTimer.current);
    stopSpeaking();
  }, []);

  const showCue = useCallback((text: string, tone: Cue["tone"], spoken: string | null) => {
    setCue({ id: ++cueId.current, text, tone });
    if (cueTimer.current) clearTimeout(cueTimer.current);
    cueTimer.current = setTimeout(() => setCue(null), CUE_VISIBLE_MS);
    const now = performance.now();
    if (voiceRef.current && spoken && now - lastSpokenAt.current > VOICE_GAP_MS) {
      lastSpokenAt.current = now;
      speak(spoken);
    }
  }, []);

  const onFrame = useCallback(
    (frame: PoseFrame | null, t: number) => {
      if (review) return; // set is over; ignore movement until the next set starts
      if (!frame) {
        engine.markLost(t);
        return;
      }
      const { signal: value, events } = engine.process(frame);
      if (debugRef.current && t - lastGaugeAt.current > GAUGE_INTERVAL_MS) {
        lastGaugeAt.current = t;
        setSignal(value);
      }
      for (const event of events) {
        if (event.type === "live") {
          // Coach the fault the moment it happens, not after the rep.
          showCue(event.fault.cue, "warn", event.fault.cue);
        } else if (event.type === "rep") {
          const { rep } = event;
          setReps((prev) => [...prev, rep]);
          const late = rep.faults.find((f) => !f.announced);
          if (late) showCue(late.cue, "warn", `${rep.index}. ${late.cue}`);
          else if (rep.faults.length > 0) showCue(`Rep ${rep.index}`, "warn", String(rep.index));
          else showCue(`Rep ${rep.index}: good form`, "good", String(rep.index));
        } else {
          setPartials((prev) => [...prev, event.rep]);
          if (!event.rep.announced) showCue(event.rep.cue, "warn", event.rep.cue);
        }
      }
    },
    [engine, review, showCue],
  );

  const resetSet = useCallback(() => {
    engine.reset();
    setReps([]);
    setPartials([]);
    setCue(null);
    setReview(null);
  }, [engine]);

  const selectExercise = useCallback((id: ExerciseId) => {
    setExerciseId(id);
    setReps([]);
    setPartials([]);
    setCue(null);
    setReview(null);
  }, []);

  const finishSet = useCallback(() => {
    if (reps.length === 0 && partials.length === 0) return;
    const summary = summarizeSet(exerciseId, reps, partials);
    setSets((prev) => [...prev, summary]);
    setReview(summary);
    setCue(null);
    stopSpeaking();
  }, [exerciseId, reps, partials]);

  /** The most recent earlier set of the same exercise, to measure improvement against. */
  const previousSet = useMemo(() => {
    if (!review) return null;
    const earlier = sets.slice(0, sets.lastIndexOf(review));
    return earlier.findLast((s) => s.exercise === review.exercise) ?? null;
  }, [review, sets]);

  return {
    config,
    exerciseId,
    selectExercise,
    reps,
    partials,
    lastRep: reps.at(-1) ?? null,
    cue,
    voice,
    setVoice,
    debug,
    setDebug,
    signal,
    onFrame,
    finishSet,
    resetSet,
    review,
    previousSet,
    setNumber: sets.length + (review ? 0 : 1),
  };
}
