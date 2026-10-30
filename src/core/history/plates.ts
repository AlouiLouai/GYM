import type { Unit } from "./stats";

/** Standard gym plates, heaviest first, in the unit's own numbers. */
export const PLATES: Record<Unit, readonly number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

export const BARS: Record<Unit, readonly number[]> = {
  kg: [20, 15, 10],
  lb: [45, 35, 25],
};

export interface PlateLoad {
  /** Plates for ONE side of the bar, heaviest first. */
  perSide: number[];
  /** What the bar actually weighs with those plates (may be below the target if it isn't loadable). */
  loaded: number;
  exact: boolean;
}

/**
 * Plates to load per side for `total` (bar included), using as few plates as possible. Greedy is optimal
 * for these plate sets. Returns null if the total is lighter than the empty bar.
 */
export function platesFor(total: number, bar: number, unit: Unit): PlateLoad | null {
  if (!(total >= bar)) return null;
  // Work in hundredths to avoid 0.1 + 0.2 float drift with 1.25 kg plates.
  let side = Math.round(((total - bar) / 2) * 100);
  const perSide: number[] = [];
  for (const plate of PLATES[unit]) {
    const p = Math.round(plate * 100);
    while (side >= p) {
      perSide.push(plate);
      side -= p;
    }
  }
  const loaded = bar + 2 * perSide.reduce((a, b) => a + b, 0);
  return { perSide, loaded, exact: side === 0 };
}
