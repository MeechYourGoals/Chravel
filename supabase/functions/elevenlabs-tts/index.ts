import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const VOICE_TTS_FREE_FOR_ALL = (Deno.env.get('VOICE_TTS_FREE_FOR_ALL') ?? 'true') !== 'false';

/** Hardcoded fallback — only used if DB lookup fails. */
const HARDCODED_PRIMARY_VOICE = '1SM7GgM6IMuvQlz2BwM3'; // Mark
const HARDCODED_FALLBACK_VOICE = 'nPczCjzI2devNBz1zQrb'; // Brian (free-tier safe)

/** Max chars to send to ElevenLabs (prevents abuse and excessive cost). */
const MAX_TEXT_CHARS = 1500;

/** Daily TTS requests per user on free tier. */
const FREE_TIER_DAILY_LIMIT = 30;
/** Daily TTS requests per user on Explorer/Plus tier. */
const EXPLORER_TIER_DAILY_LIMIT = 100;

/** Status codes from ElevenLabs that warrant a fallback voice retry. */
const FALLBACK_RETRY_STATUSES = new Set([402, 422]);

const isActiveEntitlement = (status?: string | null, periodEnd?: string | null): boolean => {
  if (status !== 'active' && status !== 'trialing') return false;
  if (!periodEnd) return true;
  const parsed = Date.parse(periodEnd);
  if (Number.isNaN(parsed)) return true;
  return parsed > Date.now();
};

const mapPlanToDailyLimit = (plan?: string | null): number | null => {
  if (!plan || plan === 'free') return FREE_TIER_DAILY_LIMIT;
  if (plan === 'explorer' || plan === 'plus') return EXPLORER_TIER_DAILY_LIMIT;
  return null;
};

/**
 * Load a setting from app_settings using the service-role client.
 * Returns null if not found or on error.
 */
async function getAppSetting(key: string): Promise<string | null> {
  try {
    const serviceClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || SUPABASE_ANON_KEY);
    const { data, error } = await serviceClient
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) {
      console.warn(`[elevenlabs-tts] app_settings lookup failed for "${key}":`, error.message);
      return null;
    }
    return data?.value ?? null;
  } catch (e) {
    console.warn(`[elevenlabs-tts] app_settings exception for "${key}":`, e);
    return null;
  }
}

/**
 * Call ElevenLabs TTS API for a given voice ID.
 */
async function callElevenLabs(
  text: string,
  voiceId: string,
  modelId: string,
  outputFormat: string,
): Promise<Response> {
  const url =
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream` +
    `?output_format=${encodeURIComponent(outputFormat)}`;

  return await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.8,
      },
    }),
  });
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const t0 = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  if (!ELEVENLABS_API_KEY) {
    console.error('[elevenlabs-tts] ELEVENLABS_API_KEY is not set');
    return new Response(JSON.stringify({ error: 'ElevenLabs API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Authenticate user via Supabase JWT
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authorization required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Parse request body
  let body: {
    speech_text?: string;
    voice_id?: string;
    output_format?: string;
    model_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Resolve voice IDs from DB (with hardcoded fallbacks)
  const [dbPrimaryVoice, dbFallbackVoice, dbModelId] = await Promise.all([
    getAppSetting('tts_primary_voice_id'),
    getAppSetting('tts_fallback_voice_id'),
    getAppSetting('tts_model_id'),
  ]);

  const primaryVoice = dbPrimaryVoice || HARDCODED_PRIMARY_VOICE;
  const fallbackVoice = dbFallbackVoice || HARDCODED_FALLBACK_VOICE;
  const defaultModel = dbModelId || 'eleven_multilingual_v2';

  const {
    speech_text,
    voice_id: requestedVoiceId,
    output_format = 'mp3_44100_128',
    model_id = defaultModel,
  } = body;

  // Use requested voice, or primary from settings
  const resolvedVoiceId = requestedVoiceId || primaryVoice;

  if (!speech_text) {
    return new Response(JSON.stringify({ error: 'speech_text is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (speech_text.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'speech_text must not be empty' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Rate limiting (skipped in launch mode)
  if (!VOICE_TTS_FREE_FOR_ALL) {
    let dailyLimit: number | null = FREE_TIER_DAILY_LIMIT;
    const { data: entitlementData, error: entitlementError } = await supabase
      .from('user_entitlements')
      .select('plan, status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (entitlementError) {
      console.error('[elevenlabs-tts] Entitlement lookup failed:', entitlementError.message);
    }

    if (
      entitlementData &&
      isActiveEntitlement(entitlementData.status, entitlementData.current_period_end)
    ) {
      dailyLimit = mapPlanToDailyLimit(entitlementData.plan);
    } else {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('app_role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('[elevenlabs-tts] Profile plan fallback failed:', profileError.message);
      }

      dailyLimit = mapPlanToDailyLimit(profileData?.app_role);
    }

    const { data: usageRow, error: usageError } = await supabase
      .from('tts_usage')
      .select('request_count')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .maybeSingle();

    if (usageError) {
      console.error('[elevenlabs-tts] Usage check failed:', usageError.message);
    }

    const currentCount = usageRow?.request_count ?? 0;
    if (dailyLimit !== null && currentCount >= dailyLimit) {
      return new Response(
        JSON.stringify({
          error: 'Daily TTS limit reached. Upgrade to Pro for unlimited voice responses.',
          limit: dailyLimit,
          used: currentCount,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  }

  // Sanitize and cap text length
  const text = speech_text.slice(0, MAX_TEXT_CHARS);

  console.log(`[elevenlabs-tts] Request: voice=${resolvedVoiceId}, model=${model_id}, textLen=${text.length}, user=${user.id}`);

  // Call ElevenLabs with primary voice
  let elevenRes: Response;
  let usedFallback = false;

  try {
    elevenRes = await callElevenLabs(text, resolvedVoiceId, model_id, output_format);

    // If primary voice fails with a retryable status, try fallback
    if (!elevenRes.ok && FALLBACK_RETRY_STATUSES.has(elevenRes.status) && resolvedVoiceId !== fallbackVoice) {
      const errBody = await elevenRes.text().catch(() => '');
      console.warn(`[elevenlabs-tts] Primary voice ${resolvedVoiceId} returned ${elevenRes.status}: ${errBody}. Retrying with fallback voice ${fallbackVoice}`);

      elevenRes = await callElevenLabs(text, fallbackVoice, model_id, output_format);
      usedFallback = true;
      console.log(`[elevenlabs-tts] Fallback voice result: status=${elevenRes.status}`);
    }
  } catch (fetchError) {
    console.error('[elevenlabs-tts] Fetch to ElevenLabs failed:', fetchError);
    return new Response(JSON.stringify({ error: 'Failed to reach ElevenLabs service' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!elevenRes.ok || !elevenRes.body) {
    const errBody = await elevenRes.text().catch(() => '');
    console.error(`[elevenlabs-tts] ElevenLabs error ${elevenRes.status}: ${errBody}`);

    // Parse ElevenLabs error detail for client
    let detail = `ElevenLabs returned ${elevenRes.status}`;
    try {
      const parsed = JSON.parse(errBody);
      if (parsed?.detail?.message) detail = parsed.detail.message;
      else if (typeof parsed?.detail === 'string') detail = parsed.detail;
    } catch { /* use default */ }

    return new Response(JSON.stringify({ error: detail }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Increment usage counter (non-blocking)
  const { error: upsertError } = await supabase.rpc('increment_tts_usage', {
    p_user_id: user.id,
    p_date: today,
  });

  if (upsertError) {
    console.warn('[elevenlabs-tts] Failed to increment usage:', upsertError.message);
  }

  const elapsed = Date.now() - t0;
  console.log(`[elevenlabs-tts] Success: fallback=${usedFallback}, elapsed=${elapsed}ms`);

  // Stream audio bytes back to client
  const responseHeaders: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'no-store',
  };

  if (usedFallback) {
    responseHeaders['X-Voice-Fallback'] = 'true';
  }

  return new Response(elevenRes.body, {
    status: 200,
    headers: responseHeaders,
  });
});
