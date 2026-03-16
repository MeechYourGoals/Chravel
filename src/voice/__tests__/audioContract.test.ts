import { describe, it, expect, vi } from 'vitest';
import {
  AUDIO_CONTRACT,
  assertChunkFraming,
  checkCaptureSampleRate,
  ensureAudioContextResumed,
} from '../audioContract';

describe('audioContract', () => {
  it('returns no resample when sample rate matches contract', () => {
    const result = checkCaptureSampleRate(AUDIO_CONTRACT.expectedSampleRateHz, false);
    expect(result).toEqual({ needsResample: false, targetHz: AUDIO_CONTRACT.expectedSampleRateHz });
  });

  it('returns resample when sample rate mismatches contract', () => {
    const result = checkCaptureSampleRate(48000, false);
    expect(result).toEqual({ needsResample: true, targetHz: AUDIO_CONTRACT.expectedSampleRateHz });
  });

  it('throws for oversized chunks', () => {
    expect(() => assertChunkFraming(AUDIO_CONTRACT.maxChunkSamples + 1, false)).toThrow(
      /Chunk too large/,
    );
  });

  it('does not throw for valid chunks', () => {
    expect(() => assertChunkFraming(320, false)).not.toThrow();
  });

  it('resumes suspended audio context', async () => {
    const ctx = {
      state: 'suspended',
      resume: vi.fn().mockResolvedValue(undefined),
    } as unknown as AudioContext;

    await ensureAudioContextResumed(ctx);
    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });

  it('throws user-friendly error when resume fails', async () => {
    const ctx = {
      state: 'suspended',
      resume: vi.fn().mockRejectedValue(new Error('blocked')),
    } as unknown as AudioContext;

    await expect(ensureAudioContextResumed(ctx)).rejects.toThrow(/Audio could not start/);
  });
});
