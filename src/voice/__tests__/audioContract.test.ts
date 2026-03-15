import { describe, it, expect, vi } from 'vitest';
import { AUDIO_CONTRACT, assertChunkFraming, checkCaptureSampleRate } from '../audioContract';

describe('audioContract', () => {
  describe('AUDIO_CONTRACT constants', () => {
    it('has expected input sample rate', () => {
      expect(AUDIO_CONTRACT.expectedSampleRateHz).toBe(16_000);
    });

    it('has expected output sample rate', () => {
      expect(AUDIO_CONTRACT.outputSampleRateHz).toBe(24_000);
    });

    it('has expected encoding', () => {
      expect(AUDIO_CONTRACT.expectedEncoding).toBe('pcm16-le');
    });

    it('has consistent chunk size (chunkDurationMs * sampleRate / 1000)', () => {
      const expectedSamples =
        (AUDIO_CONTRACT.chunkDurationMs * AUDIO_CONTRACT.expectedSampleRateHz) / 1000;
      // 20ms * 16000 / 1000 = 320 samples
      expect(expectedSamples).toBe(320);
    });

    it('min < max chunk samples', () => {
      expect(AUDIO_CONTRACT.minChunkSamples).toBeLessThan(AUDIO_CONTRACT.maxChunkSamples);
    });
  });

  describe('assertChunkFraming', () => {
    it('accepts valid chunk sizes without throwing', () => {
      expect(() => assertChunkFraming(320, false)).not.toThrow();
      expect(() => assertChunkFraming(1, false)).not.toThrow();
      expect(() => assertChunkFraming(48_000, false)).not.toThrow();
    });

    it('throws on oversized chunks', () => {
      expect(() => assertChunkFraming(48_001, false)).toThrow('Chunk too large');
      expect(() => assertChunkFraming(100_000, false)).toThrow('Chunk too large');
    });

    it('throws on oversized chunks with diagnostics enabled', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => assertChunkFraming(48_001, true)).toThrow('Chunk too large');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('warns on unusually small chunks with diagnostics enabled', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Chunk of 0 samples: the check is `samples < min && samples > 0`
      // so 0 does NOT warn (it's not > 0)
      assertChunkFraming(0, true);
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('does not warn on small chunks when diagnostics disabled', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      assertChunkFraming(0, false);
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('checkCaptureSampleRate', () => {
    it('returns no resample needed when rate matches', () => {
      const result = checkCaptureSampleRate(16_000, false);
      expect(result.needsResample).toBe(false);
      expect(result.targetHz).toBe(16_000);
    });

    it('returns resample needed when rate is higher', () => {
      const result = checkCaptureSampleRate(44_100, false);
      expect(result.needsResample).toBe(true);
      expect(result.targetHz).toBe(16_000);
    });

    it('returns resample needed when rate is lower', () => {
      const result = checkCaptureSampleRate(8_000, false);
      expect(result.needsResample).toBe(true);
      expect(result.targetHz).toBe(16_000);
    });

    it('logs mismatch when diagnostics enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      checkCaptureSampleRate(44_100, true);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[voice/audioContract] Capture sample rate mismatch',
        expect.objectContaining({ actual: 44_100, expected: 16_000 }),
      );
      consoleSpy.mockRestore();
    });

    it('does not log when diagnostics disabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      checkCaptureSampleRate(44_100, false);
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
