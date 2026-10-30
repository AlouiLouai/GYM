import { NextResponse } from "next/server";
import { buildPrompt, systemInstruction } from "@/core/coach/prompt";
import { CoachRequestSchema } from "@/core/coach/schema";

// Gemini's free tier is rate-limited and may use prompts to improve Google products,
// so only validated numbers are ever forwarded (see core/coach/schema.ts).
//
// No single hosted model is always up: they return 503 "high demand" in bursts and answer in
// ~1 s or ~10 s depending on load. So the models below are raced with staggered starts: the first
// goes out immediately, the next only if the previous has not answered after STAGGER_MS (or has already
// failed). The first good answer wins and the rest are cancelled, so the normal cost is one call.
// Check https://ai.google.dev/gemini-api/docs/models for current IDs; retired ones just 404 and are skipped.
const DEFAULT_MODELS = "gemini-3.6-flash,gemini-flash-lite-latest,gemini-3.1-flash-lite";
const MODELS = (process.env.GEMINI_MODEL ?? DEFAULT_MODELS)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
const STAGGER_MS = 2_000;
const ATTEMPT_TIMEOUT_MS = 8_000;
// Overall cap, so the endpoint can never outlive the function limit; the client then shows its local note.
const TOTAL_BUDGET_MS = 9_000;
const MAX_BODY_BYTES = 4_000;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

// Seconds. Above the 9 s budget, below every Vercel plan's ceiling.
export const maxDuration = 15;

// Best-effort per-instance limiter. Serverless instances don't share memory, so this stops
// accidental hammering from one client but is not a hard quota; Gemini's own limits are the backstop.
// For a real quota add a Vercel Firewall rate-limit rule on /api/coach (see README).
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 1000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return recent.length > MAX_PER_WINDOW;
}

/** Every response is per-request data: never let a CDN or browser cache it. */
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

interface GeminiResponse {
  candidates?: {
    finishReason?: string;
    content?: { parts?: { text?: string; thought?: boolean }[] };
  }[];
}

/** Asks one model for the note. Resolves to the text, or throws if the model could not provide one. */
async function askModel(model: string, apiKey: string, body: object, signal: AbortSignal): Promise<string> {
  // Thinking models spend the output cap on hidden reasoning and can cut the note off after a few
  // words (finishReason MAX_TOKENS). Turn thinking off where the model allows it; a model that rejects
  // the setting (400) is retried without it, with a roomy cap. A truncated note is rejected, never shown.
  let res: Response | null = null;
  for (const thinkingOff of [true, false]) {
    res = await fetch(endpoint(model), {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        ...body,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
          ...(thinkingOff ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
      signal,
    });
    if (res.status !== 400) break;
  }
  // 404 = model retired/renamed, 429 = quota for this model, 503 = overloaded: the caller moves on.
  if (!res || !res.ok) throw new Error(`HTTP ${res?.status}`);

  const candidate = ((await res.json()) as GeminiResponse).candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") throw new Error("hit the token cap (truncated note)");
  const text = candidate?.content?.parts
    ?.filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("returned no text");
  return text;
}

/** Races the models with staggered starts and resolves to the first good note, or null if none made it. */
function firstNote(models: string[], apiKey: string, body: object): Promise<string | null> {
  return new Promise((resolve) => {
    const cancel = new AbortController();
    let launched = 0;
    let running = 0;
    let settled = false;
    let stagger: ReturnType<typeof setTimeout> | undefined;

    const finish = (text: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(stagger);
      clearTimeout(budget);
      cancel.abort(); // stop the slower requests so they stop costing quota
      resolve(text);
    };
    const budget = setTimeout(() => finish(null), TOTAL_BUDGET_MS);

    const launchNext = () => {
      clearTimeout(stagger);
      if (settled || launched >= models.length) return;
      const model = models[launched++];
      running++;
      askModel(model, apiKey, body, AbortSignal.any([cancel.signal, AbortSignal.timeout(ATTEMPT_TIMEOUT_MS)]))
        .then(finish, (e: unknown) => {
          if (!settled) console.error(`[coach] ${model} failed:`, e instanceof Error ? e.message : e);
        })
        .finally(() => {
          running--;
          // A failure should not make the user wait out the stagger: bring the next model in now.
          if (settled) return;
          if (launched < models.length) launchNext();
          else if (running === 0) finish(null);
        });
      if (launched < models.length) stagger = setTimeout(launchNext, STAGGER_MS);
    };
    launchNext();
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return reply({ error: "not-configured" }, 503);

  // Browsers always send Sec-Fetch-Site; a request from another site is someone else's page
  // trying to spend our Gemini quota. (Non-browser clients omit it and are handled by the limiter.)
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return reply({ error: "forbidden" }, 403);

  // On Vercel the platform overwrites x-forwarded-for, so the first hop is the real client.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) return reply({ error: "rate-limited" }, 429);

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return reply({ error: "unsupported-media-type" }, 415);
  }
  // Reject on the declared length before buffering anything, then re-check the real size.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return reply({ error: "too-large" }, 413);
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return reply({ error: "too-large" }, 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply({ error: "invalid-json" }, 400);
  }
  const parsed = CoachRequestSchema.safeParse(body);
  if (!parsed.success) return reply({ error: "invalid-request" }, 400);

  const text = await firstNote(MODELS, apiKey, {
    systemInstruction: { parts: [{ text: systemInstruction(parsed.data.lang) }] },
    contents: [{ role: "user", parts: [{ text: buildPrompt(parsed.data) }] }],
  });
  return text ? reply({ text }) : reply({ error: "upstream" }, 502);
}
