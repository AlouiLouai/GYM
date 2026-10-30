"use client";

import { useEffect, useRef, useState } from "react";

/** Seconds left until `endsAt` (epoch ms), ticking while it runs. Calls `onDone` once when it reaches zero. */
export function useRestTimer(endsAt: number | null, onDone: () => void): number | null {
  // 0 until a timer starts: the effect reads the clock immediately (reading it during render
  // is not allowed while prerendering).
  const [now, setNow] = useState(0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    if (endsAt === null) return;
    let fired = false;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (!fired && t >= endsAt) {
        fired = true;
        done.current();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  if (endsAt === null || now === 0) return null;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export const formatClock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
