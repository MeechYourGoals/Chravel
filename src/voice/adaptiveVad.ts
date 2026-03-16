/**
 * Adaptive Voice Activity Detection — replaces static RMS threshold
 * with a dynamic threshold calibrated to ambient noise.
 *
 * Usage:
 *   1. Create instance at session start
 *   2. Feed RMS samples via calibrate() during initial silence (~500ms)
 *   3. Once isCalibrated(), use detect() to check for speech
 *   4. Call reset() when starting a new session
 */

const STATIC_FALLBACK_THRESHOLD = 0.035;

export interface AdaptiveVadConfig {
  /** Number of calibration frames to collect. Default 25 (~500ms at 50fps). */
  calibrationFrames: number;
  /** Multiplier applied to noise floor median. Default 3.5. */
  multiplier: number;
  /** Minimum allowed threshold. Default 0.01. */
  floorThreshold: number;
  /** Maximum allowed threshold. Default 0.1. */
  ceilingThreshold: number;
  /** Consecutive frames above threshold required to trigger detection. Default 3. */
  hangoverFrames: number;
}

const DEFAULT_CONFIG: Required<AdaptiveVadConfig> = {
  calibrationFrames: 25,
  multiplier: 3.5,
  floorThreshold: 0.01,
  ceilingThreshold: 0.1,
  hangoverFrames: 3,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export class AdaptiveVad {
  private config: Required<AdaptiveVadConfig>;
  private calibrationSamples: number[] = [];
  private calibrated: boolean = false;
  private threshold: number = STATIC_FALLBACK_THRESHOLD;
  private consecutiveAbove: number = 0;

  constructor(config?: Partial<AdaptiveVadConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Feed an RMS sample during calibration phase. Call during initial silence after session start. */
  calibrate(rms: number): void {
    if (this.calibrated) return;

    this.calibrationSamples.push(rms);

    if (this.calibrationSamples.length >= this.config.calibrationFrames) {
      const allZero = this.calibrationSamples.every(s => s === 0);

      if (allZero) {
        // Muted mic — fall back to static threshold
        this.threshold = STATIC_FALLBACK_THRESHOLD;
      } else {
        const noiseFloor = median(this.calibrationSamples);
        this.threshold = clamp(
          noiseFloor * this.config.multiplier,
          this.config.floorThreshold,
          this.config.ceilingThreshold,
        );
      }

      this.calibrated = true;
    }
  }

  /** Returns true once enough calibration frames have been collected. */
  isCalibrated(): boolean {
    return this.calibrated;
  }

  /** Returns true if sustained voice activity detected (RMS above dynamic threshold for N frames). */
  detect(rms: number): boolean {
    const activeThreshold = this.calibrated ? this.threshold : STATIC_FALLBACK_THRESHOLD;

    if (rms > activeThreshold) {
      this.consecutiveAbove += 1;
    } else {
      this.consecutiveAbove = 0;
    }

    return this.consecutiveAbove >= this.config.hangoverFrames;
  }

  /** Current dynamic threshold (or static fallback if not calibrated). */
  getThreshold(): number {
    return this.threshold;
  }

  /** Reset all state for a new session. */
  reset(): void {
    this.calibrationSamples = [];
    this.calibrated = false;
    this.threshold = STATIC_FALLBACK_THRESHOLD;
    this.consecutiveAbove = 0;
  }
}
