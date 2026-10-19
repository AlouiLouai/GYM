/** Thin wrapper over the Web Speech API so the coach can talk. No-ops where unsupported. */
export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel(); // never queue: stale cues are worse than none mid-set
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1.1;
  synth.speak(utterance);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/**
 * Call from a user tap. iOS Safari only lets speech start from a user gesture, so speaking
 * here unlocks later cues (which fire from the camera loop, outside any tap). The phrase
 * doubles as an audible check that the phone is not muted.
 */
export function primeSpeech(phrase = "Coach ready") {
  speak(phrase);
}
