import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  parseServiceAccountKey,
  createVertexAccessToken,
} from '../_shared/vertexAuth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const VOICE_TTS_FREE_FOR_ALL = (Deno.env.get('VOICE_TTS_FREE_FOR_ALL') ?? 'true') !== 'false';

/** Hardcoded fallback voices — only used if DB lookup fails. */
const HARDCODED_PRIMARY_VOICE = 'en-US-Chirp3-HD-Charon';
const HARDCODED_FALLBACK_VOICE = 'en-US-Neural2-J';

/** Max chars to send to Google Cloud TTS (prevents abuse and excessive cost). */
const MAX_TEXT_CHARS = 1500;

/** Daily TTS requests per user on free tier. */
const FREE_TIER_DAILY_LIMIT = 30;
/** Daily TTS requests per user on Explorer/Plus tier. */
const EXPLORER_TIER_DAILY_LIMIT = 100;

/** Status codes from Google Cloud TTS that warrant a fallback voice retry. */
const FALLBACK_RETRY_STATUSES = new Set([400, 403, 404]);

// ── Module-level OAuth2 token cache ──
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  // Reuse token if it has >2 min remaining
  if (cachedAccessToken && tokenExpiresAt - now > 120_000) {
    return cachedAccessToken;
  }

  const saKeyBase64 = Deno.env.get('VERTEX_SERVICE_ACCOUNT_KEY');
  if (!saKeyBase64) {
    throw new Error('VERTEX_SERVICE_ACCOUNT_KEY is not set');
  }

  const saKey = parseServiceAccountKey(saKeyBase64);
  cachedAccessToken = await createVertexAccessToken(saKey);
  tokenExpiresAt = now + 3500_000; // ~58 min (tokens last 1 hour)
  return cachedAccessToken;
}

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

async function getAppSetting(key: string): Promise<string | null> {
  try {
    const serviceClient = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || SUPABASE_ANON_KEY,
    );
    const { data, error } = await serviceClient
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) {
      console.warn(`[concierge-tts] app_settings lookup failed for "${key}":`, error.message);
      return null;
    }
    return data?.value ?? null;
  } catch (e) {
    console.warn(`[concierge-tts] app_settings exception for "${key}":`, e);
    return null;
  }
}

const toGoogleVoiceName = (rawVoice: string): string => {
  const trimmed = rawVoice.trim();
  if (!trimmed) return HARDCODED_PRIMARY_VOICE;

  if (trimmed.toLowerCase() === 'charon') {
    return HARDCODED_PRIMARY_VOICE;
  }

  // Backward compatibility for previous provider IDs previously stored in app_settings.
  if (!trimmed.includes('-')) {
    return HARDCODED_PRIMARY_VOICE;
  }

  return trimmed;
};

const decodeBase64Audio = (audioContent: string): Uint8Array => {
  const binary = atob(audioContent);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

async function callGoogleCloudTTS(text: string, voiceName: string): Promise<Response> {
  const accessToken = await getAccessToken();
  const url = 'https://texttospeech.googleapis.com/v1/text:synthesize';

  return await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: voiceName,
        ssmlGender: 'MALE',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1,
      },
    }),
  });
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const t0 = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Validate that VERTEX_SERVICE_ACCOUNT_KEY is available
  if (!Deno.env.get('VERTEX_SERVICE_ACCOUNT_KEY')) {
    console.error('[concierge-tts] VERTEX_SERVICE_ACCOUNT_KEY is not set');
    return new Response(JSON.stringify({ error: 'TTS service account key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

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

  let body: {
    speech_text?: string;
    voice_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const [dbPrimaryVoice, dbFallbackVoice] = await Promise.all([
    getAppSetting('tts_primary_voice_id'),
    getAppSetting('tts_fallback_voice_id'),
  ]);

  const primaryVoice = toGoogleVoiceName(dbPrimaryVoice || HARDCODED_PRIMARY_VOICE);
  const fallbackVoice = toGoogleVoiceName(dbFallbackVoice || HARDCODED_FALLBACK_VOICE);

  const { speech_text, voice_id: requestedVoiceId } = body;
  const resolvedVoiceId = toGoogleVoiceName(requestedVoiceId || primaryVoice);

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

  if (!VOICE_TTS_FREE_FOR_ALL) {
    let dailyLimit: number | null = FREE_TIER_DAILY_LIMIT;
    const { data: entitlementData, error: entitlementError } = await supabase
      .from('user_entitlements')
      .select('plan, status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (entitlementError) {
      console.error('[concierge-tts] Entitlement lookup failed:', entitlementError.message);
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
        console.error('[concierge-tts] Profile plan fallback failed:', profileError.message);
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
      console.error('[concierge-tts] Usage check failed:', usageError.message);
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

  const text = speech_text.slice(0, MAX_TEXT_CHARS);

  console.log(
    `[concierge-tts] Request: voice=${resolvedVoiceId}, textLen=${text.length}, user=${user.id}`,
  );

  let ttsRes: Response;
  let usedFallback = false;

  try {
    ttsRes = await callGoogleCloudTTS(text, resolvedVoiceId);

    if (
      !ttsRes.ok &&
      FALLBACK_RETRY_STATUSES.has(ttsRes.status) &&
      resolvedVoiceId !== fallbackVoice
    ) {
      const errBody = await ttsRes.text().catch(() => '');
      console.warn(
        `[concierge-tts] Primary voice ${resolvedVoiceId} returned ${ttsRes.status}: ${errBody}. Retrying with fallback voice ${fallbackVoice}`,
      );

      // If auth failed (403), invalidate cached token before retry
      if (ttsRes.status === 403) {
        cachedAccessToken = null;
        tokenExpiresAt = 0;
      }

      ttsRes = await callGoogleCloudTTS(text, fallbackVoice);
      usedFallback = true;
      console.log(`[concierge-tts] Fallback voice result: status=${ttsRes.status}`);
    }
  } catch (fetchError) {
    console.error('[concierge-tts] Fetch to Google Cloud TTS failed:', fetchError);
    return new Response(JSON.stringify({ error: 'Failed to reach Google Cloud TTS service' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!ttsRes.ok) {
    const errBody = await ttsRes.text().catch(() => '');
    console.error(`[concierge-tts] Google Cloud TTS error ${ttsRes.status}: ${errBody}`);

    let detail = `Google Cloud TTS returned ${ttsRes.status}`;
    try {
      const parsed = JSON.parse(errBody);
      if (parsed?.error?.message) detail = parsed.error.message;
      else if (typeof parsed?.detail === 'string') detail = parsed.detail;
    } catch {
      // use default detail
    }

    return new Response(JSON.stringify({ error: detail }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let audioBytes: Uint8Array;
  try {
    const payload = await ttsRes.json();
    const audioContent = payload?.audioContent;
    if (typeof audioContent !== 'string' || audioContent.length === 0) {
      throw new Error('Missing audioContent');
    }
    audioBytes = decodeBase64Audio(audioContent);
  } catch (parseError) {
    console.error('[concierge-tts] Failed to parse Google TTS audio payload:', parseError);
    return new Response(JSON.stringify({ error: 'Voice service returned invalid audio payload' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { error: upsertError } = await supabase.rpc('increment_tts_usage', {
    p_user_id: user.id,
    p_date: today,
  });

  if (upsertError) {
    console.warn('[concierge-tts] Failed to increment usage:', upsertError.message);
  }

  const elapsed = Date.now() - t0;
  console.log(`[concierge-tts] Success: fallback=${usedFallback}, elapsed=${elapsed}ms`);

  const responseHeaders: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'no-store',
  };

  if (usedFallback) {
    responseHeaders['X-Voice-Fallback'] = 'true';
  }

  return new Response(audioBytes as unknown as BodyInit, {
    status: 200,
    headers: responseHeaders,
  });
});
