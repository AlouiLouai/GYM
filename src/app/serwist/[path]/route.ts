import { createSerwistRoute } from "@serwist/turbopack";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Precache revision for the offline fallback page: tied to the commit on Vercel (stable and
// reproducible), a fresh value per local build otherwise, so a redeploy always replaces the cached copy.
const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? crypto.randomUUID();

// Version of the self-hosted MediaPipe runtime (written by scripts/setup-assets.mjs). The service worker
// caches /wasm and /models forever, so the cache name must change with the runtime or upgraded
// users would keep a stale runtime that no longer matches the JS bundle.
const mediapipeVersion = readFileSync(join(process.cwd(), "public", "wasm", ".version"), "utf8").trim();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
    esbuildOptions: { define: { __MEDIAPIPE_VERSION__: JSON.stringify(mediapipeVersion) } },
  });
