/**
 * One Euro filter (Casiez et al., 2012): a low-pass filter whose cutoff rises with
 * speed, so slow movement is smoothed heavily (no jitter) while fast movement
 * stays responsive (no lag). Ideal for noisy pose signals.
 */
export interface OneEuroOptions {
  /** Minimum cutoff in Hz. Lower = smoother when still. */
  minCutoff?: number;
  /** Speed coefficient. Higher = less lag during fast movement. */
  beta?: number;
  /** Cutoff in Hz for the derivative estimate. */
  derivativeCutoff?: number;
}

const alpha = (cutoff: number, dt: number) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
};

export class OneEuroFilter {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly derivativeCutoff: number;
  private lastValue: number | null = null;
  private lastDerivative = 0;
  private lastTimeMs = 0;

  constructor({ minCutoff = 1.5, beta = 0.05, derivativeCutoff = 1 }: OneEuroOptions = {}) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.derivativeCutoff = derivativeCutoff;
  }

  filter(value: number, timeMs: number): number {
    if (this.lastValue === null) {
      this.lastValue = value;
      this.lastTimeMs = timeMs;
      return value;
    }
    const dt = (timeMs - this.lastTimeMs) / 1000;
    if (dt <= 0) return this.lastValue; // duplicate/out-of-order timestamp
    const derivative = (value - this.lastValue) / dt;
    const smoothedDerivative =
      this.lastDerivative + alpha(this.derivativeCutoff, dt) * (derivative - this.lastDerivative);
    const cutoff = this.minCutoff + this.beta * Math.abs(smoothedDerivative);
    const filtered = this.lastValue + alpha(cutoff, dt) * (value - this.lastValue);

    this.lastValue = filtered;
    this.lastDerivative = smoothedDerivative;
    this.lastTimeMs = timeMs;
    return filtered;
  }

  reset() {
    this.lastValue = null;
    this.lastDerivative = 0;
  }
}
