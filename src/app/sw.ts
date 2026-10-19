import { defaultCache } from "@serwist/turbopack/worker";
import { CacheFirst, ExpirationPlugin, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;
/** Injected at build time by the /serwist route (see route.ts). */
declare const __MEDIAPIPE_VERSION__: string;

const MEDIAPIPE_CACHE = `mediapipe-assets-${__MEDIAPIPE_VERSION__}`;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // The MediaPipe runtime (~40 MB) and pose model are large and immutable:
      // fetch once, then serve from cache so the coach works offline.
      matcher: ({ url }) =>
        url.pathname.startsWith("/wasm/") || url.pathname.startsWith("/models/"),
      handler: new CacheFirst({
        cacheName: MEDIAPIPE_CACHE,
        plugins: [new ExpirationPlugin({ maxEntries: 16 })],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// Drop runtime caches left by earlier MediaPipe versions (~40 MB each) once the new worker is active.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("mediapipe-assets") && name !== MEDIAPIPE_CACHE)
            .map((name) => caches.delete(name)),
        ),
      ),
  );
});
