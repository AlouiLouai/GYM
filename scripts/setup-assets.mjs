// Self-hosts the MediaPipe WASM runtime and the pose model under /public so the
// app works offline and never depends on a third-party CDN at runtime.
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wasmSrc = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmDest = join(root, "public", "wasm");
const modelDest = join(root, "public", "models", "pose_landmarker_lite.task");

// Pinned model version + checksum: a build never silently ships a different (or tampered) model.
// To upgrade, change the version in the URL and the hash together.
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const MODEL_SHA256 = "59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a";
const DOWNLOAD_ATTEMPTS = 3;

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function downloadModel() {
  let lastError;
  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(MODEL_URL, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = Buffer.from(await res.arrayBuffer());
      const actual = sha256(data);
      if (actual !== MODEL_SHA256) throw new Error(`checksum mismatch (got ${actual})`);
      return data;
    } catch (e) {
      lastError = e;
      console.warn(`[setup-assets] model download attempt ${attempt}/${DOWNLOAD_ATTEMPTS} failed: ${e.message}`);
      if (attempt < DOWNLOAD_ATTEMPTS) await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }
  throw lastError;
}

if (!existsSync(wasmSrc)) {
  console.error("[setup-assets] @mediapipe/tasks-vision is not installed; run pnpm install.");
  process.exit(1);
}
// Only copy when the installed package version changed (the runtime is ~40 MB).
const version = JSON.parse(await readFile(join(wasmSrc, "..", "package.json"), "utf8")).version;
const stamp = join(wasmDest, ".version");
const current = existsSync(stamp) ? (await readFile(stamp, "utf8")).trim() : null;
if (current !== version) {
  await cp(wasmSrc, wasmDest, { recursive: true });
  await writeFile(stamp, version);
  console.log(`[setup-assets] copied MediaPipe WASM ${version} -> public/wasm`);
}

// Re-download when the file is missing or does not match the pinned checksum (e.g. a truncated download).
const modelOk = existsSync(modelDest) && sha256(await readFile(modelDest)) === MODEL_SHA256;
if (!modelOk) {
  try {
    const data = await downloadModel();
    await mkdir(dirname(modelDest), { recursive: true });
    // Write then rename so an interrupted build never leaves a half-written model behind.
    await writeFile(`${modelDest}.tmp`, data);
    await rename(`${modelDest}.tmp`, modelDest);
    console.log("[setup-assets] downloaded + verified pose_landmarker_lite.task -> public/models");
  } catch (e) {
    console.error(`[setup-assets] model download failed: ${e.message}`);
    process.exit(1);
  }
}
