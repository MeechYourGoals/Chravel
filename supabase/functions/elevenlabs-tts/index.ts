import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/** Max chars to send to ElevenLabs (prevents abuse and excessive cost). */
const MAX_TEXT_CHARS = 1500;

/** Daily TTS requests per user on free tier. */
const FREE_TIER_DAILY_LIMIT = 30;

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  if (!ELEVENLABS_API_KEY) {
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

  const {
    speech_text,
    voice_id,
    output_format = 'mp3_44100_128',
    model_id = 'eleven_multilingual_v2',
  } = body;

  if (!speech_text || !voice_id) {
    return new Response(JSON.stringify({ error: 'speech_text and voice_id are required' }), {
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

  // Rate limiting: check daily usage
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const { data: usageRow, error: usageError } = await supabase
    .from('tts_usage')
    .select('request_count')
    .eq('user_id', user.id)
    .eq('usage_date', today)
    .maybeSingle();

  if (usageError) {
    console.error('[elevenlabs-tts] Usage check failed:', usageError.message);
    // Non-blocking: allow request but log the error
  }

  const currentCount = usageRow?.request_count ?? 0;
  if (currentCount >= FREE_TIER_DAILY_LIMIT) {
    return new Response(
      JSON.stringify({
        error: 'Daily TTS limit reached. Upgrade to Pro for unlimited voice responses.',
        limit: FREE_TIER_DAILY_LIMIT,
        used: currentCount,
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Sanitize and cap text length
  const text = speech_text.slice(0, MAX_TEXT_CHARS);

  // Call ElevenLabs streaming TTS
  const elevenLabsUrl =
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice_id)}/stream` +
    `?output_format=${encodeURIComponent(output_format)}`;

  let elevenRes: Response;
  try {
    elevenRes = await fetch(elevenLabsUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
        },
      }),
    });
  } catch (fetchError) {
    console.error('[elevenlabs-tts] Fetch to ElevenLabs failed:', fetchError);
    return new Response(JSON.stringify({ error: 'Failed to reach ElevenLabs service' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!elevenRes.ok || !elevenRes.body) {
    const errBody = await elevenRes.text().catch(() => '');
    console.error(`[elevenlabs-tts] ElevenLabs error ${elevenRes.status}:`, errBody);
    return new Response(JSON.stringify({ error: `ElevenLabs returned ${elevenRes.status}` }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Increment usage counter (upsert: insert or increment)
  const { error: upsertError } = await supabase.rpc('increment_tts_usage', {
    p_user_id: user.id,
    p_date: today,
  });

  if (upsertError) {
    // Non-blocking: log but still serve the audio
    console.error('[elevenlabs-tts] Failed to increment usage:', upsertError.message);
  }

  // Stream audio bytes back to client
  return new Response(elevenRes.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  });
});
