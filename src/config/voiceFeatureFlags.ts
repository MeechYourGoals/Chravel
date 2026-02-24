/**
 * Voice feature flags — ship-safe hardening layer.
 *
 * Environment-driven flags with safe defaults. Resolved at runtime via
 * import.meta.env (Vite injects at build time; values can be overridden
 * in .env.local for local dev).
 *
 * Usage:
 *   - VOICE_LIVE_ENABLED: Gate voice UI + initialization. false = no voice init.
 *   - VOICE_DIAGNOSTICS_ENABLED: Extra console logs for debugging.
 *   - VOICE_USE_WEBSOCKET_ONLY: Enforce duplex transport; reject SSE/HTTP fallback.
 */

type VoiceEnvKey =
  | 'VITE_VOICE_LIVE_ENABLED'
  | 'VITE_VOICE_DIAGNOSTICS_ENABLED'
  | 'VITE_VOICE_USE_WEBSOCKET_ONLY';

const getEnv = (key: VoiceEnvKey, fallback: string): string => {
  try {
    const v = (import.meta.env as Record<string, string | undefined>)[key];
    return typeof v === 'string' ? v : fallback;
  } catch {
    return fallback;
  }
};

const parseBool = (value: string): boolean => value.toLowerCase() === 'true' || value === '1';

/** Voice Live (Gemini bidirectional) enabled. Default: false — dictation-only mode. */
export const VOICE_LIVE_ENABLED = parseBool(getEnv('VITE_VOICE_LIVE_ENABLED', 'false'));

/** Extra diagnostics (connection codes, audio params) when true. Default: false. */
export const VOICE_DIAGNOSTICS_ENABLED = parseBool(
  getEnv('VITE_VOICE_DIAGNOSTICS_ENABLED', 'false'),
);

/** Require WebSocket for Live voice; reject silent downgrade to SSE/HTTP. Default: true. */
export const VOICE_USE_WEBSOCKET_ONLY = parseBool(getEnv('VITE_VOICE_USE_WEBSOCKET_ONLY', 'true'));

/** All voice flags for debugging / diagnostics. */
export function getVoiceFlags(): {
  VOICE_LIVE_ENABLED: boolean;
  VOICE_DIAGNOSTICS_ENABLED: boolean;
  VOICE_USE_WEBSOCKET_ONLY: boolean;
} {
  return {
    VOICE_LIVE_ENABLED,
    VOICE_DIAGNOSTICS_ENABLED,
    VOICE_USE_WEBSOCKET_ONLY,
  };
}
