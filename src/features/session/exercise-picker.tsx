"use client";

import { useState } from "react";
import type { ExerciseId } from "@/core/engine/types";
import { EXERCISE_GROUPS, EXERCISES } from "@/core/exercises/definitions";
import { useI18n } from "@/lib/i18n";
import { TARGET_OPTIONS, toggleFavorite, useSettings } from "@/lib/settings";

/** Lower-case, and strip Arabic diacritics/tatweel and hamza variants so "أرنولد" matches "ارنولد". */
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[-–]/g, " ");

function Chip({ selected, onSelect, label }: { selected: boolean; onSelect: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium active:scale-95 ${
        selected ? "bg-lime-400 text-zinc-950" : "bg-zinc-800/90 text-zinc-200 backdrop-blur"
      }`}
    >
      {label}
    </button>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-1.5 text-xs font-medium tracking-wide text-zinc-500 uppercase">{title}</h2>
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </section>
  );
}

export function ExercisePicker({
  selected,
  onSelect,
  target,
  onTarget,
}: {
  selected: ExerciseId;
  onSelect: (id: ExerciseId) => void;
  target: number | null;
  onTarget: (n: number | null) => void;
}) {
  const { t } = useI18n();
  const { favorites, recent } = useSettings();
  const [query, setQuery] = useState("");
  const q = normalize(query.trim());

  const chip = (id: ExerciseId) => (
    <Chip key={id} selected={selected === id} onSelect={() => onSelect(id)} label={t.exercises[id].name} />
  );
  // Search in the current language and in English, so "squat" also finds "سكوات".
  const matches = q
    ? (Object.keys(EXERCISES) as ExerciseId[]).filter((id) =>
        [t.exercises[id].name, EXERCISES[id].name].some((name) => normalize(name).includes(q)),
      )
    : [];
  const current = t.exercises[selected];
  const isFavorite = favorites.includes(selected);

  return (
    <div className="flex w-full flex-col gap-4">
      {/* The choice and how to set up for it, on top so it's visible without scrolling. */}
      <div className="rounded-2xl bg-zinc-900/90 p-4 text-start backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{current.name}</p>
            <p className="mt-0.5 text-xs font-medium text-lime-400">
              📷 {EXERCISES[selected].view === "front" ? t.ui.frontView : t.ui.sideView}
              {EXERCISES[selected].hold && ` · ⏱ ${t.ui.holdTime}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleFavorite(selected)}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? t.ui.removeFavorite : t.ui.addFavorite}
            className="-m-1 rounded-full p-2 text-2xl leading-none active:scale-90"
          >
            {isFavorite ? "⭐" : "☆"}
          </button>
        </div>
        <p className="mt-2 text-sm text-zinc-300">{current.hint}</p>
        {!EXERCISES[selected].hold && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">{t.ui.targetReps}</span>
            {TARGET_OPTIONS.map((n) => (
              <button
                key={n ?? "free"}
                type="button"
                onClick={() => onTarget(n)}
                aria-pressed={target === n}
                className={`h-9 min-w-9 rounded-full px-2.5 text-sm font-medium active:scale-95 ${
                  target === n ? "bg-lime-400 text-zinc-950" : "bg-zinc-800 text-zinc-200"
                }`}
              >
                {n ?? t.ui.free}
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`🔍 ${t.ui.search}`}
        aria-label={t.ui.search}
        className="h-12 w-full rounded-full bg-zinc-800/90 px-5 text-base outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-lime-400"
      />

      {q ? (
        matches.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2">{matches.map(chip)}</div>
        ) : (
          <p className="text-sm text-zinc-500">{t.ui.noMatch}</p>
        )
      ) : (
        <>
          {favorites.length > 0 && <Row title={`⭐ ${t.ui.favorites}`}>{favorites.map(chip)}</Row>}
          {recent.length > 1 && <Row title={`🕘 ${t.ui.recent}`}>{recent.map(chip)}</Row>}
          {EXERCISE_GROUPS.map(({ group, exercises }) => (
            <Row key={group} title={t.groups[group]}>
              {exercises.map((ex) => chip(ex.id))}
            </Row>
          ))}
        </>
      )}
    </div>
  );
}
