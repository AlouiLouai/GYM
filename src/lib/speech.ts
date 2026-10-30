import { langInfo, type Lang } from "@/core/i18n";

/** Thin wrapper over the Web Speech API so the coach can talk. No-ops where unsupported. */
export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// ---------------------------------------------------------------------------------------------
// Voice choice. The OS default is often the robotic "compact" voice; most phones also ship a
// much better neural/enhanced one, it's just not the default. Pick that.

let voices: SpeechSynthesisVoice[] = [];
function loadVoices() {
  if (!canSpeak()) return;
  voices = window.speechSynthesis.getVoices();
}
if (canSpeak()) {
  loadVoices();
  // Chrome fills the list asynchronously.
  window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
}

const GOOD = /natural|neural|premium|enhanced|online/i;
const BAD = /compact|espeak|robot/i;

function score(voice: SpeechSynthesisVoice, tags: readonly string[]): number {
  const lang = voice.lang.replace("_", "-").toLowerCase();
  const tagIndex = tags.findIndex((t) => lang === t.toLowerCase() || lang.startsWith(`${t.toLowerCase()}-`));
  if (tagIndex === -1) return -Infinity;
  let s = (tags.length - tagIndex) * 3;
  if (GOOD.test(voice.name)) s += 10;
  if (/siri/i.test(voice.name)) s += 8;
  if (/google/i.test(voice.name)) s += 5;
  if (BAD.test(voice.name)) s -= 10;
  if (voice.localService) s += 1; // works offline in the gym basement
  return s;
}

/** Voices for this language, best first. */
export function voicesFor(lang: Lang): SpeechSynthesisVoice[] {
  if (voices.length === 0) loadVoices();
  const tags = langInfo(lang).speech;
  return voices
    .map((v) => ({ v, s: score(v, tags) }))
    .filter(({ s }) => s > -Infinity)
    .sort((a, b) => b.s - a.s)
    .map(({ v }) => v);
}

function pickVoice(lang: Lang, preferred: string | null): SpeechSynthesisVoice | null {
  const list = voicesFor(lang);
  return list.find((v) => v.name === preferred) ?? list[0] ?? null;
}

// ---------------------------------------------------------------------------------------------
// Speaking. Cues are short and timely, so we never queue. But a fault correction must not be cut
// off by the next rep number: a lower-priority line is dropped while a higher one is still talking.

let currentPriority = 0;

export interface SpeakOptions {
  lang: Lang;
  voiceName?: string | null;
  /** 2 = correction, 1 = count/encouragement. */
  priority?: number;
}

export function speak(text: string, { lang, voiceName = null, priority = 1 }: SpeakOptions) {
  if (!canSpeak() || !text) return;
  const synth = window.speechSynthesis;
  if (synth.speaking && priority < currentPriority) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(lang, voiceName);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? langInfo(lang).speech[0];
  // 1.1 sounded rushed and slightly chipmunk-like; Arabic voices are clearer a touch slower.
  utterance.rate = lang === "en" ? 1 : 0.95;
  utterance.pitch = 1;
  currentPriority = priority;
  utterance.onend = utterance.onerror = () => {
    currentPriority = 0;
  };
  synth.speak(utterance);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
  currentPriority = 0;
}

// ---------------------------------------------------------------------------------------------
// Beeps, for lifters who want feedback without a voice.

let audio: AudioContext | null = null;

function tone(freq: number, startIn: number, ms: number) {
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const t = audio.currentTime + startIn;
  osc.frequency.value = freq;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  osc.connect(gain).connect(audio.destination);
  osc.start(t);
  osc.stop(t + ms / 1000 + 0.02);
}

/** Bright single beep: a clean rep. */
export const beep = () => tone(880, 0, 120);
/** Two low beeps: a fault. */
export const buzz = () => {
  tone(330, 0, 110);
  tone(330, 0.16, 110);
};
/** Rising triple: rest over / new PR. */
export const fanfare = () => {
  tone(660, 0, 120);
  tone(880, 0.14, 120);
  tone(1100, 0.28, 220);
};

/**
 * Call from a user tap. iOS Safari only lets speech and audio start from a user gesture, so doing it
 * here unlocks later cues (which fire from the camera loop, outside any tap). The phrase doubles as
 * an audible check that the phone is not muted.
 */
export function primeSpeech(phrase: string | null, options: SpeakOptions) {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    // No Web Audio: beeps just stay silent.
  }
  if (phrase) speak(phrase, options);
}
