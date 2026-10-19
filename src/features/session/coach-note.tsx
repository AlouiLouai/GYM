"use client";

import { useEffect, useMemo, useState } from "react";
import { localCoachNote } from "@/core/coach/local-note";
import { toCoachRequest } from "@/core/coach/request";
import type { SetSummary } from "@/core/engine/set-summary";

type NoteState = { status: "loading" } | { status: "done"; text: string; source: "ai" | "local" };

/**
 * Short written feedback for the set. Asks the server (Gemini) with numbers only, and falls back
 * to a deterministic local note when offline, rate-limited or unconfigured, so it never stays empty.
 * Mount with a `key` per set so state resets for each new summary.
 */
export function CoachNote({ summary, previous }: { summary: SetSummary; previous: SetSummary | null }) {
  const request = useMemo(() => toCoachRequest(summary, previous), [summary, previous]);
  const fallback = useMemo(() => localCoachNote(request), [request]);
  const [state, setState] = useState<NoteState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`coach api ${res.status}`);
        const { text } = (await res.json()) as { text?: string };
        if (!text) throw new Error("empty note");
        setState({ status: "done", text, source: "ai" });
      } catch {
        if (!controller.signal.aborted) setState({ status: "done", text: fallback, source: "local" });
      }
    })();
    return () => controller.abort();
  }, [request, fallback]);

  return (
    <section className="mt-4 rounded-xl bg-zinc-900 p-3" aria-live="polite">
      <p className="mb-1 text-xs text-zinc-500">
        {state.status === "done" && state.source === "ai" ? "AI coach note" : "Coach note"}
      </p>
      {state.status === "loading" ? (
        <div className="space-y-2" aria-label="Writing your coach note">
          <div className="h-3 w-full animate-pulse rounded bg-zinc-800" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-800" />
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-zinc-200">{state.text}</p>
      )}
    </section>
  );
}
