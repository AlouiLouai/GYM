# Gym Coach

A PWA that watches you lift through your phone camera, counts reps, and coaches your form in real time.
Pose tracking (MediaPipe) runs **on the device**: video is never uploaded.

> Beta. A form assistant, not a certified coach or medical advice. Thresholds are coaching
> conventions that have not yet been validated against labelled footage.

## Features

- 44 exercises in six groups: legs & glutes (squat, front, goblet and sumo squat, lunge, reverse lunge, Bulgarian split squat, deadlift, sumo and Romanian deadlift, good morning, glute bridge, hip thrust), push (push-up, incline and diamond push-up, bench press, close-grip bench, dip, bench dip, overhead tricep extension, skull crusher), pull (pull-up, chin-up, bent-over, one-arm and inverted row, bicep and hammer curl), shoulders (shoulder press, Arnold press, pike push-up, lateral and front raise, upright row) and core & cardio (sit-up, hanging and lying leg raise, jumping jack, jump squat, kettlebell swing) and timed holds (plank, side plank, wall sit).
- Timed holds: the clock starts when you are in position, keeps running through a short wobble, ends the set by itself when you drop, calls out every 10 s and coaches sagging hips or sitting too high. Longest hold is a PR.
- Line-up outline: before the first rep, a ghost of the start position shows where to stand; it turns green when your whole body is in frame.
- Plate calculator under the weight field: which plates to load per side for the bar you use (20/15/10 kg or 45/35/25 lb).
- Weekly progress chart in History: sets, reps, volume or hold time for the last 8 weeks, compared with last week.
- Live skeleton overlay and a "full body in frame" check.
- Rep counting with partial-rep detection and a 0-100 form score per rep.
- **Live voice and on-screen cues** the moment a fault is detected (mid-rep), not after the rep.
- Set summary with fatigue signals and comparison against your previous set (in memory only).
- **Smart voice coach**: counts reps, corrects a fault once and then only if it comes back, says "Better!" when
  you fix it, and counts down to a target ("two more", "last one"). Modes: Smart / Everything / Reps only /
  Beeps / Silent. Picks the best installed voice instead of the robotic default.
- **English, Standard Arabic and Tunisian Derja** (UI, cues, voice and coach note), with right-to-left layout.
  Phones don't ship a Tunisian voice, so an Arabic voice reads the Derja cues.
- Weight and RPE per set, saved history (localStorage, on device), PRs (heaviest, estimated 1RM, most reps,
  best form), training streak, rest timer and target reps.
- Shareable set card image (native share sheet, or download).
- Hands-free sets: the set finishes itself after a few seconds without a rep (with a "Keep going" option),
  haptic feedback per rep, and the last exercise is reopened next time.
- Exercise picker with search (English or Arabic names), favorites and recent exercises.
- Optional AI coach note (Gemini) in the chosen language, with an offline/local fallback.
- Installable, works offline once the model has been cached.

## Stack

Next.js 16 (App Router, Cache Components), React 19, Tailwind v4, MediaPipe Tasks Vision,
Serwist (service worker), Zod, Vitest. Package manager: pnpm.

## Develop

```bash
pnpm install
pnpm dev          # fetches the MediaPipe runtime + model into public/, then starts Next
pnpm test         # unit tests for the coaching engine
pnpm typecheck && pnpm lint
```

Open `http://localhost:3000/session`. Phones need HTTPS for the camera: use `pnpm dev --experimental-https`
or the deployed URL.

The **Debug** button shows the live joint angle against the exercise thresholds, which is the quickest way to
understand why a cue did or did not fire.

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel (framework: Next.js; install: `pnpm install`;
   build: `pnpm build`, which also downloads the MediaPipe runtime and model).
2. Optional environment variables (Project Settings -> Environment Variables):
   - `GEMINI_API_KEY`: free key from <https://aistudio.google.com/apikey>. Without it the app uses the local
     coach note.
   - `GEMINI_MODEL`: comma-separated model IDs (default `gemini-3.6-flash,gemini-flash-lite-latest,gemini-3.1-flash-lite`).
     They are raced with staggered starts: the first goes out immediately, the next after 2 s or as soon as the
     previous fails, and the first good answer wins. A retired or overloaded model is skipped, and if none
     answers within 9 s the app shows the local note. Confirm current IDs at
     <https://ai.google.dev/gemini-api/docs/models>. (If you set this in Vercel, update it there too.)
3. Open the deployed URL on a phone. On iOS: Share -> Add to Home Screen.

4. Recommended: in Vercel -> Firewall, add a rate-limit rule for `POST /api/coach` (for example 10 requests
   per minute per IP). The in-app limiter is per serverless instance, so this is the real quota.
5. Smoke test the **preview** deployment on a phone before promoting: camera permission, a few reps, and the
   browser console (the production CSP is not active in `pnpm dev`, so a blocked resource only shows up there).

Note: the free Gemini tier may use prompts to improve Google products. This app only sends validated numbers
(never video or free text). See `src/core/coach/schema.ts`.

## Architecture

```
src/core/        Pure TypeScript, no DOM: geometry, smoothing, rep detector, exercise engine, coaching notes
src/core/exercises/definitions.ts   All exercise thresholds and cues live here
src/features/session/               Camera, MediaPipe runtime, overlay, live HUD, set summary
src/app/api/coach/                  Gemini route (validated input, rate limit, timeout)
next.config.ts                      Security headers + CSP (static rules, production), cache headers
```

Adding an exercise means adding a config to `definitions.ts` plus tests; the engine is shared.

## Known limitations

- Accuracy depends on camera angle, lighting and the whole body being in frame (side-on for most lifts).
- Thresholds for every exercise, especially the seven added later (lunge, Romanian deadlift, glute bridge, dip,
  lateral raise, pull-up, bent-over row), are tested against synthetic skeletons only. Tune them with the Debug
  gauge on real footage. Lateral raise works best facing the camera; glute bridge (lying down) is the least
  reliable because pose models are weaker on a person lying on the floor.
- Some checks (for example knee cave) only work from the front; deadlift back rounding cannot be detected.
- The per-instance rate limiter on `/api/coach` is best-effort on serverless.
