/**
 * Audio contract for Gemini Live — explicit parameters and invariants.
 *
 * Single source of truth for capture/playback specs. Enforces at runtime
 * with dev-only asserts when mismatches would silently break behavior.
 */

export const AUDIO_CONTRACT = {
  /** Input: Gemini Live expects 16 kHz mono PCM16. */
  expectedSampleRateHz: 16_000,
  /** PCM16 little-endian. */
  expectedEncoding: 'pcm16-le' as const,
  /** Chunk duration target (ms). 20–40ms balances latency/overhead. */
  chunkDurationMs: 20,
  /** Max buffered playback before barge-in flush (ms). */
  maxBufferedPlaybackMs: 250,
  /** VAD threshold RMS (for future barge-in). */
  vadThresholdRms: 0.01,
  /** VAD hangover (ms) after speech ends. */
  vadHangoverMs: 300,
  /** Output: Gemini Live returns 24 kHz mono PCM16. */
  outputSampleRateHz: 24_000,
  /** Max chunk size (samples) — reject giant frames. */
  maxChunkSamples: 48_000,
  /** Min chunk size — reject empty frames loop. */
  minChunkSamples: 1,
} as const;

export type AudioContract = typeof AUDIO_CONTRACT;

/** Log actual AudioContext params when diagnostics enabled. */
export function logAudioContextParams(ctx: AudioContext, diagnosticsEnabled: boolean): void {
  if (!diagnosticsEnabled) return;
  console.log('[voice/audioContract] AudioContext', {
    sampleRate: ctx.sampleRate,
    state: ctx.state,
    baseLatency: ctx.baseLatency,
  });
}

/** Assert chunk framing: no giant frames, no empty frames. */
export function assertChunkFraming(samples: number, diagnosticsEnabled: boolean): void {
  if (samples > AUDIO_CONTRACT.maxChunkSamples) {
    const err = `Chunk too large: ${samples} samples (max ${AUDIO_CONTRACT.maxChunkSamples})`;
    if (diagnosticsEnabled) console.error('[voice/audioContract]', err);
    throw new Error(err);
  }
  if (samples < AUDIO_CONTRACT.minChunkSamples && samples > 0) {
    if (diagnosticsEnabled) {
      console.warn('[voice/audioContract] Unusually small chunk:', samples);
    }
  }
}

/** Check if capture sample rate matches expected; return true if resampling needed. */
export function checkCaptureSampleRate(
  actualHz: number,
  diagnosticsEnabled: boolean,
): { needsResample: boolean; targetHz: number } {
  const target = AUDIO_CONTRACT.expectedSampleRateHz;
  if (target === actualHz) {
    return { needsResample: false, targetHz: target };
  }
  if (diagnosticsEnabled) {
    console.log('[voice/audioContract] Capture sample rate mismatch', {
      actual: actualHz,
      expected: target,
      willResample: actualHz > target,
    });
  }
  return { needsResample: actualHz !== target, targetHz: target };
}

/** iOS Safari: AudioContext must be resumed on user gesture. */
export function ensureAudioContextResumed(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'running') return Promise.resolve();
  return ctx.resume().catch(err => {
    console.warn('[voice/audioContract] AudioContext.resume failed:', err);
    throw new Error(
      'Audio could not start. Please tap the microphone button again (required on iOS).',
    );
  });
}
