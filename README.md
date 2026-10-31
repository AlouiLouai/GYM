# Gym Coach

**An AI gym coach in your browser.** Gym Coach watches you train through your phone camera, counts your reps,
times your holds and coaches your form in real time, in English, Arabic or Tunisian Derja.

Pose tracking runs entirely **on the device**. Video is never uploaded, and your workout history stays in your
browser.

**Live app:** <https://gym-umber-six.vercel.app>

> **Beta.** Gym Coach is a form assistant, not a certified coach or medical advice. Exercise thresholds follow
> common coaching conventions and have been validated against synthetic skeletons, not yet against labelled
> footage.

---

## Contents

- [Features](#features)
- [Supported exercises](#supported-exercises)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Privacy](#privacy)
- [Known limitations](#known-limitations)

## Features

### Coaching

- **Rep counting** with partial-rep detection and a 0–100 form score for every rep.
- **Live cues** on screen and by voice the moment a fault happens, mid-rep, not after it.
- **Smart voice coach.** It corrects a fault once, repeats it only if it comes back, and says "Better!" when you
  fix it. It counts down to your target ("two more", "last one") and picks the best installed voice. Five modes:
  Smart, Everything, Reps only, Beeps and Silent.
- **Timed holds** (plank, side plank, wall sit). The clock starts once you are in position and forgives a short
  wobble. The set ends by itself when you drop. Time is called out every 10 seconds, with form cues during the
  hold.
- **Line-up outline.** Before the first rep, a ghost of the start position shows where to stand. It turns green
  when your whole body is in frame.
- **Optional AI coach note** (Google Gemini) after each set, with an offline fallback.

### Training log

- Weight and RPE for each set, with a **plate calculator**: the plates to load per side for your bar (20/15/10 kg
  or 45/35/25 lb).
- **Personal records:** heaviest set, estimated 1RM, most reps, longest hold and best form, with a celebration
  when you beat one.
- **Weekly progress chart** of sets, reps, volume or hold time over the last 8 weeks, compared with last week.
- Training streak, rest timer, target reps, and a full history with undo.
- **Shareable set card** through the native share sheet, or as a download.

### Experience

- **Three languages:** English, Standard Arabic and Tunisian Derja, with a right-to-left layout. Phones don't ship
  a Tunisian voice, so an Arabic voice reads the Derja cues.
- **Hands-free sets.** A set finishes itself a few seconds after the last rep, with a "Keep going" option.
  Optional haptic feedback on every rep.
- **Fast exercise picker** with search in English or Arabic, favourites and recent exercises. Your last exercise
  reopens next time.
- **Installable PWA** that works offline once the pose model is cached.

## Supported exercises

44 exercises in six groups:

| Group | Exercises |
| --- | --- |
| Legs & glutes | Squat, front squat, goblet squat, sumo squat, lunge, reverse lunge, Bulgarian split squat, deadlift, sumo deadlift, Romanian deadlift, good morning, glute bridge, hip thrust |
| Push | Push-up, incline push-up, diamond push-up, bench press, close-grip bench press, dip, bench dip, overhead tricep extension, skull crusher |
| Pull | Pull-up, chin-up, bent-over row, one-arm row, inverted row, bicep curl, hammer curl |
| Shoulders | Shoulder press, Arnold press, pike push-up, lateral raise, front raise, upright row |
| Core & cardio | Sit-up, hanging leg raise, lying leg raise, jumping jack, jump squat, kettlebell swing |
| Holds | Plank, side plank, wall sit |

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Pose estimation | MediaPipe Tasks Vision (Pose Landmarker, on device) |
| Offline / PWA | Serwist service worker |
| Validation | Zod (API route) |
| Analytics | Vercel Web Analytics (page views only, no cookies) |
| Testing | Vitest |
| Package manager | pnpm |
| Runtime | Node.js 24 |

## Getting started

### Prerequisites

- Node.js 24 (Node 20.9 or later works locally)
- pnpm 10

### Install and run

```bash
pnpm install
pnpm dev
```

`pnpm dev` downloads the MediaPipe runtime and pose model into `public/`, then starts Next.js. Open
<http://localhost:3000>.

Phones only allow the camera over HTTPS. To test on a phone, run `pnpm dev --experimental-https` or use a
deployed URL.

### Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Fetch assets and start the dev server |
| `pnpm build` | Fetch assets and create a production build |
| `pnpm start` | Serve the production build |
| `pnpm test` | Run the unit tests (engine, exercises, holds, stats, voice policy) |
| `pnpm typecheck` | Type-check the project |
| `pnpm lint` | Lint with ESLint |

**Tip:** turn on **Debug** in Settings to see the live joint angle next to the exercise's thresholds. It is the
quickest way to understand why a cue did or didn't fire.

## Configuration

All environment variables are optional. Copy `.env.example` to `.env.local` to set them locally.

| Variable | Description |
| --- | --- |
| `GEMINI_API_KEY` | Enables the AI coach note. Get a free key at <https://aistudio.google.com/apikey>. Without it, the app uses its built-in local note. |
| `GEMINI_MODEL` | Comma-separated Gemini model IDs. Default: `gemini-3.6-flash,gemini-flash-lite-latest,gemini-3.1-flash-lite`. |

How the model list is used:

- The models are raced with staggered starts. The first request goes out immediately, and the next one after
  2 seconds or as soon as the previous one fails.
- The first good answer wins, and a retired or overloaded model is skipped.
- If no model answers within 9 seconds, the app shows the local note instead.

Check current model IDs at <https://ai.google.dev/gemini-api/docs/models>.

## Deployment

The app is built for [Vercel](https://vercel.com).

1. Import the repository in Vercel. The framework is detected as Next.js. The install command is
   `pnpm install`, and the build command is `pnpm build`, which also downloads the MediaPipe assets.
2. Node.js is pinned to **24.x** through `engines` in `package.json`.
3. Optionally, add `GEMINI_API_KEY` (and `GEMINI_MODEL`) under **Settings → Environment Variables**.
4. Enable **Web Analytics** under the project's **Analytics** tab. The `<Analytics />` component is already
   included.
5. Recommended: add a Firewall rate-limit rule for `POST /api/coach`, for example 10 requests per minute per IP.
   The in-app limiter works per serverless instance only, so the firewall rule is the real quota.
6. Before promoting to production, test the preview deployment on a real phone. Check the camera permission, do
   a few reps, and look at the browser console. The production Content Security Policy is not active in
   `pnpm dev`, so a blocked resource only shows up on a deployment.

Pushing to `main` deploys to production. Other branches get preview deployments.

## Project structure

```
src/
├── app/                    Routes: home, session, history, settings, API, manifest, service worker
│   └── api/coach/          Gemini coach note (validated input, rate limit, timeout)
├── core/                   Pure TypeScript, no DOM, fully unit-tested
│   ├── engine/             Rep detector, exercise engine, set summaries
│   ├── exercises/          Exercise definitions (thresholds, checks), line-up outlines
│   ├── hold/               Timed-hold engine
│   ├── history/            Stats, PRs, streaks, weekly totals, plate calculator
│   ├── coach/              Voice policy, coach-note prompt and local fallback
│   └── i18n/               English, Arabic and Derja messages
├── features/               UI by feature: session, history, settings, home, share
├── components/             Shared components
└── lib/                    Browser glue: speech, settings and history stores, hooks
```

Adding an exercise means adding a config to `src/core/exercises/definitions.ts`, translations in
`src/core/i18n/`, and a synthetic-skeleton test. The engine itself is shared.

## Privacy

- **Camera video never leaves the device.** Pose estimation runs locally with WebAssembly and the GPU.
- **Workout history and settings** are stored in the browser's `localStorage`. There is no account and no
  database.
- **The AI coach note** sends only validated numbers (exercise, rep count, scores, fault IDs), never video or
  free text. The schema is in `src/core/coach/schema.ts`. Google's free Gemini tier may use prompts to improve
  its products.
- **Vercel Web Analytics** records anonymous page views without cookies.

## Known limitations

- Accuracy depends on the camera angle, the lighting, and your whole body being in frame. Most lifts work best
  side-on.
- Thresholds are tested against synthetic skeletons only, so tune them with the Debug gauge on real footage.
  Exercises done lying down (glute bridge, lying leg raise) are the least reliable, because pose models are
  weaker on a person on the floor.
- Some checks only work from one camera angle. For example, knee cave is only detected from the front. Back
  rounding on the deadlift can't be detected.
- The in-app rate limiter on `/api/coach` is best-effort on serverless.
