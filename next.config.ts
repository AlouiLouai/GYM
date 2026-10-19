import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

// Camera access is the core feature, so it is allowed for our own origin only.
// Everything else the app does not need is switched off.
const SECURITY_HEADERS = [
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

// 'unsafe-inline' is needed for Next's inline bootstrap scripts (a nonce would make every page dynamic).
// 'wasm-unsafe-eval' lets MediaPipe compile its WebAssembly, without allowing JS eval.
// connect-src 'self': the browser only ever talks to our own origin; Gemini is called server-side.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

// Dev tooling (HMR, React refresh) relies on eval, so the CSP and HSTS are production-only.
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  // MediaPipe prints harmless native warnings via console.warn; only forward real errors.
  logging: { browserToTerminal: "error" },
  async headers() {
    // The MediaPipe runtime and model are large and change only with a package upgrade:
    // let browsers/CDN reuse them for a week (the service worker also caches them).
    const longCache = [
      { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
    ];
    return [
      // Static header rules (not a request-time proxy): they cost no compute per request and,
      // unlike a proxy matcher, also cover the service worker and the self-hosted assets.
      {
        source: "/:path*",
        headers: [
          ...SECURITY_HEADERS,
          ...(isProd
            ? [
                { key: "Content-Security-Policy", value: CSP },
                { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
              ]
            : []),
        ],
      },
      // The service worker must always be revalidated or users could be stuck on an old version.
      {
        source: "/serwist/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      { source: "/wasm/:path*", headers: longCache },
      { source: "/models/:path*", headers: longCache },
      { source: "/icons/:path*", headers: longCache },
    ];
  },
  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSerwist(nextConfig);
