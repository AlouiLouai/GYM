"use client";

import { useState } from "react";
import { BARS, PLATES, platesFor } from "@/core/history/plates";
import type { Unit } from "@/core/history/stats";
import { useI18n } from "@/lib/i18n";
import { updateSettings, useSettings } from "@/lib/settings";

// Competition plate colours, heaviest first (the same order as PLATES), so the bar looks like the real one.
const PLATE_STYLE = [
  "bg-red-600 text-white",
  "bg-blue-600 text-white",
  "bg-yellow-400 text-zinc-950",
  "bg-green-600 text-white",
  "bg-zinc-100 text-zinc-950",
  "bg-zinc-700 text-white",
  "bg-zinc-400 text-zinc-950",
];

/** "Which plates do I load?" for the weight typed in the set summary. Collapsed by default. */
export function PlateCalculator({ weightText, unit }: { weightText: string; unit: Unit }) {
  const { t } = useI18n();
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const bar = settings.bar[unit];
  const total = Number(weightText.replace(",", "."));
  const load = total > 0 ? platesFor(total, bar, unit) : null;
  const plates = PLATES[unit];

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rounded-full bg-zinc-800 px-3 py-1.5 text-xs font-medium active:scale-95"
      >
        🏋️ {t.ui.plates} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="mt-2 rounded-xl bg-zinc-950/60 p-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>{t.ui.bar}</span>
            {BARS[unit].map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={bar === b}
                onClick={() => updateSettings({ bar: { ...settings.bar, [unit]: b } })}
                className={`rounded-full px-2.5 py-1 font-medium ${bar === b ? "bg-lime-400 text-zinc-950" : "bg-zinc-800 text-zinc-200"}`}
                dir="ltr"
              >
                {b}
              </button>
            ))}
          </div>

          {load && (
            <>
              {/* One side of the bar: collar on the left, plates outward. Heavier plates are taller. */}
              <div className="mt-3 flex h-20 items-center" dir="ltr" aria-label={load.perSide.join(" + ")}>
                <div className="h-3 w-6 rounded-s bg-zinc-500" />
                <div className="h-6 w-1.5 bg-zinc-400" />
                {load.perSide.map((p, i) => {
                  const rank = plates.indexOf(p);
                  const height = 40 + (60 * p) / plates[0];
                  return (
                    <div
                      key={i}
                      className={`ms-0.5 flex w-7 items-center justify-center rounded-sm text-[10px] font-bold [writing-mode:vertical-rl] ${PLATE_STYLE[rank]}`}
                      style={{ height: `${height}%` }}
                    >
                      {p}
                    </div>
                  );
                })}
                <div className="h-3 flex-1 rounded-e bg-zinc-500" />
              </div>
              <p className="mt-2 text-sm" dir="auto">
                {load.perSide.length === 0 ? (
                  t.ui.emptyBar
                ) : (
                  <>
                    <strong dir="ltr">{load.perSide.join(" + ")}</strong> {t.ui.perSide}
                  </>
                )}
              </p>
              {!load.exact && (
                <p className="mt-1 text-xs text-amber-400">{t.ui.closestLoad(`${load.loaded} ${unit}`)}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
