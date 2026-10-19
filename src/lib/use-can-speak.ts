"use client";

import { useSyncExternalStore } from "react";
import { canSpeak } from "./speech";

const subscribe = () => () => {};

/** Hydration-safe "does this browser support speech": false on the server, real value on the client. */
export function useCanSpeak(): boolean {
  return useSyncExternalStore(subscribe, canSpeak, () => false);
}
