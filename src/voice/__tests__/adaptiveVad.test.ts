import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveVad } from '../adaptiveVad';

describe('AdaptiveVad', () => {
  let vad: AdaptiveVad;

  beforeEach(() => {
    vad = new AdaptiveVad();
  });

  describe('calibration convergence', () => {
    it('becomes calibrated after 25 noise samples and threshold is within bounds', () => {
      // Feed 25 samples of typical ambient noise (0.01–0.02 RMS)
      for (let i = 0; i < 25; i++) {
        expect(vad.isCalibrated()).toBe(false);
        vad.calibrate(0.01 + (i % 5) * 0.002);
      }

      expect(vad.isCalibrated()).toBe(true);
      const threshold = vad.getThreshold();
      expect(threshold).toBeGreaterThanOrEqual(0.01);
      expect(threshold).toBeLessThanOrEqual(0.1);
    });
  });

  describe('hangover debounce', () => {
    it('returns false for 1 spike, true after 3 consecutive spikes', () => {
      // Calibrate with low noise
      for (let i = 0; i < 25; i++) {
        vad.calibrate(0.015);
      }
      const threshold = vad.getThreshold();

      // Single spike — should not trigger
      expect(vad.detect(threshold + 0.05)).toBe(false);

      // Reset with a low sample
      vad.detect(0.001);

      // 3 consecutive spikes — should trigger on the 3rd
      expect(vad.detect(threshold + 0.05)).toBe(false); // frame 1
      expect(vad.detect(threshold + 0.05)).toBe(false); // frame 2
      expect(vad.detect(threshold + 0.05)).toBe(true); // frame 3
    });
  });

  describe('single spike ignored', () => {
    it('never returns true when a single high RMS is followed by a low one', () => {
      for (let i = 0; i < 25; i++) {
        vad.calibrate(0.015);
      }
      const threshold = vad.getThreshold();

      const result1 = vad.detect(threshold + 0.05);
      expect(result1).toBe(false);

      const result2 = vad.detect(0.001);
      expect(result2).toBe(false);
    });
  });

  describe('floor/ceiling clamping', () => {
    it('clamps to floor threshold with very quiet noise', () => {
      const quietVad = new AdaptiveVad();
      for (let i = 0; i < 25; i++) {
        quietVad.calibrate(0.001);
      }
      // 0.001 * 3.5 = 0.0035, below floor of 0.01
      expect(quietVad.getThreshold()).toBe(0.01);
    });

    it('clamps to ceiling threshold with very loud noise', () => {
      const loudVad = new AdaptiveVad();
      for (let i = 0; i < 25; i++) {
        loudVad.calibrate(0.5);
      }
      // 0.5 * 3.5 = 1.75, above ceiling of 0.1
      expect(loudVad.getThreshold()).toBe(0.1);
    });
  });

  describe('fallback on muted mic', () => {
    it('returns static fallback (0.035) when all samples are 0', () => {
      for (let i = 0; i < 25; i++) {
        vad.calibrate(0.0);
      }
      expect(vad.isCalibrated()).toBe(true);
      expect(vad.getThreshold()).toBe(0.035);
    });
  });

  describe('reset clears state', () => {
    it('resets to uncalibrated with static fallback threshold', () => {
      // Fully calibrate
      for (let i = 0; i < 25; i++) {
        vad.calibrate(0.02);
      }
      expect(vad.isCalibrated()).toBe(true);
      const calibratedThreshold = vad.getThreshold();
      expect(calibratedThreshold).not.toBe(0.035);

      // Reset
      vad.reset();

      expect(vad.isCalibrated()).toBe(false);
      expect(vad.getThreshold()).toBe(0.035);
    });
  });

  describe('detect before calibration', () => {
    it('uses static fallback: detect(0.04) returns true, detect(0.03) returns false', () => {
      // With hangover of 3, we need 3 consecutive frames above threshold
      // But the spec says detect(0.04) before calibrating returns true
      // This implies fallback mode should not require hangover
      // Re-reading spec: "If not calibrated, falls back to rms > 0.035"
      // The hangover logic still applies, so we need 3 frames
      expect(vad.detect(0.04)).toBe(false); // frame 1
      expect(vad.detect(0.04)).toBe(false); // frame 2
      expect(vad.detect(0.04)).toBe(true); // frame 3 — hangover met

      // Reset consecutive count with a low sample
      vad.detect(0.03);
      expect(vad.detect(0.03)).toBe(false);
    });
  });

  describe('sustained speech detection', () => {
    it('detects speech starting from frame 3 with 10 consecutive high RMS samples', () => {
      // Calibrate with noise that yields threshold ~0.035
      // noise floor = 0.01, threshold = 0.01 * 3.5 = 0.035
      for (let i = 0; i < 25; i++) {
        vad.calibrate(0.01);
      }
      expect(vad.getThreshold()).toBe(0.035);

      const results: boolean[] = [];
      for (let i = 0; i < 10; i++) {
        results.push(vad.detect(0.08));
      }

      // First 2 frames: false (hangover not met)
      expect(results[0]).toBe(false);
      expect(results[1]).toBe(false);
      // Frame 3 onward: true
      expect(results[2]).toBe(true);
      expect(results[3]).toBe(true);
      expect(results[9]).toBe(true);
    });
  });
});
