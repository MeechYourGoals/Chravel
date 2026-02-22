/**
 * Voice config and Gemini Live API constants.
 *
 * Operators: To verify GEMINI_API_KEY is set in Supabase, call checkVoiceConfig().
 * GET /functions/v1/gemini-voice-session returns { configured: true } when the key is set.
 * If configured=true but voice fails with 403, the key may have API restrictions.
 */

import { SUPABASE_PROJECT_URL } from '@/integrations/supabase/client';

/** Gemini Live WebSocket endpoint (v1alpha preview API). If Google changes this, update here. */
export const GEMINI_LIVE_WEBSOCKET_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

export interface VoiceConfigStatus {
  configured: boolean;
  message?: string;
  model?: string;
  service?: string;
}

/**
 * Check if voice (Gemini Live) is configured. No auth required.
 * Use this to verify GEMINI_API_KEY is set when debugging voice issues.
 */
export async function checkVoiceConfig(): Promise<VoiceConfigStatus> {
  const url = SUPABASE_PROJECT_URL;
  if (!url) {
    return { configured: false, message: 'Supabase URL not configured' };
  }
  try {
    const res = await fetch(`${url}/functions/v1/gemini-voice-session`);
    const data = (await res.json()) as {
      configured?: boolean;
      message?: string;
      model?: string;
      service?: string;
    };
    return {
      configured: !!data.configured,
      message: data.message,
      model: data.model,
      service: data.service,
    };
  } catch (err) {
    return {
      configured: false,
      message: err instanceof Error ? err.message : 'Failed to check voice config',
    };
  }
}
