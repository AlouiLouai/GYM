"use client";

import { useEffect } from "react";

/** Keeps the screen on while `active`, so the phone doesn't dim mid-set. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // Denied (e.g. low battery); the workout still works, the screen may dim.
      }
    };
    // The lock is dropped whenever the tab is hidden; take it again on return.
    const onVisible = () => {
      if (!released && document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, [active]);
}
