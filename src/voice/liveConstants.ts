/**
 * Constants and pure helper functions for Gemini Live voice sessions.
 *
 * Extracted from useGeminiLive to reduce hook size and improve testability.
 */

// ── Protocol constants ──

export const LIVE_INPUT_MIME = 'audio/pcm;rate=16000';
export const WEBSOCKET_SETUP_TIMEOUT_MS = 20_000;
export const THINKING_DELAY_MS = 1_500;
export const BARGE_IN_RMS_THRESHOLD = 0.035;
export const WS_KEEPALIVE_INTERVAL_MS = 15_000;
export const AUTO_RECONNECT_DELAY_MS = 2_000;
export const MAX_AUTO_RECONNECT_RETRIES = 2;

/** Structured debug logging — enabled in dev mode or when VITE_VOICE_DEBUG=true */
export const VOICE_DEBUG =
  typeof import.meta !== 'undefined' &&
  (import.meta.env?.DEV || import.meta.env?.VITE_VOICE_DEBUG === 'true');

export function voiceLog(event: string, data?: Record<string, unknown>): void {
  if (!VOICE_DEBUG) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[GeminiLive ${ts}] ${event}`, data ?? '');
}

// Safari < 14.5 exposes webkitAudioContext instead of AudioContext
export const SafeAudioContext: typeof AudioContext | undefined =
  typeof window !== 'undefined'
    ? (window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    : undefined;

// Precomputed silent PCM16 frame for keepalive (320 samples = 20ms @ 16kHz).
// Gemini may not recognize an empty mediaChunks array as valid data, so we send
// real silence to keep the WebSocket alive and avoid server-side idle timeout.
export const SILENT_KEEPALIVE_FRAME = (() => {
  const samples = 320;
  const pcm16 = new Int16Array(samples); // All zeros = silence
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
})();

let idCounter = 0;
export function uniqueId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

// ── Error mapping ──

export function mapSessionError(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes('unregistered callers') ||
    lower.includes('callers without established identity')
  ) {
    return 'Voice failed: API key missing or restricted. Ensure GEMINI_API_KEY is set in Supabase Edge Function secrets.';
  }
  if (raw.includes('403') || lower.includes('not enabled')) {
    return 'Voice is unavailable right now (API configuration issue). Please try again later.';
  }
  if (
    lower.includes('gemini_api_key') ||
    lower.includes('api key') ||
    lower.includes('not configured')
  ) {
    return 'Voice AI is not configured. Please contact support.';
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('authentication')) {
    return 'Voice session authentication failed. Please refresh the page and try again.';
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('quota')) {
    return 'Voice service is busy right now. Please wait a moment and try again.';
  }
  if (lower.includes('503') || lower.includes('service unavailable')) {
    return 'Voice service is temporarily unavailable. Please try again shortly.';
  }
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return 'Voice service is responding slowly. Check your connection and try again.';
  }
  return raw;
}

export function mapWsCloseError(code: number, reason: string): string | null {
  if (code === 1000 || code === 1005) return null;
  if (reason) return `Voice disconnected: ${reason} (code ${code})`;
  const MESSAGES: Record<number, string> = {
    1001: 'Voice session ended (browser navigated away).',
    1002: 'Voice connection protocol error — please try again.',
    1006: 'Voice connection dropped — check your internet and try again.',
    1011: 'Voice server error — please try again.',
    4000: 'Voice session expired — please start a new session.',
    4001: 'Voice session not authorized — please refresh and try again.',
    4429: 'Voice rate limit reached — please wait a moment and try again.',
  };
  return MESSAGES[code] ?? `Voice disconnected unexpectedly (code ${code}).`;
}
