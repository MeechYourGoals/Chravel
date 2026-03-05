import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/security.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const DEFAULT_VOICE = 'en-US-Neural2-J';
const FALLBACK_VOICE = 'en-US-Wavenet-D';
const MAX_TEXT_CHARS = 1500;

/** Map simple format strings to Google Cloud encoding + container. */
function resolveEncoding(format: string): { encoding: string; contentType: string } {
  switch (format) {
    case 'mp3_22050_32':
    case 'mp3_44100_64':
    case 'mp3_44100_96':
    case 'mp3_44100_128':
    case 'mp3':
      return { encoding: 'MP3', contentType: 'audio/mpeg' };
    case 'ogg':
    case 'ogg_opus':
      return { encoding: 'OGG_OPUS', contentType: 'audio/ogg' };
    case 'pcm':
    case 'pcm_16000':
      return { encoding: 'LINEAR16', contentType: 'audio/wav' };
    default:
      return { encoding: 'MP3', contentType: 'audio/mpeg' };
  }
}

/** Extract sample rate hint from format string (e.g. mp3_22050_32 → 22050). */
function resolveSampleRate(format: string): number {
  const match = format.match(/_(\d{4,6})_/);
  return match ? Number(match[1]) : 24000;
}

/** Resolve voice name — accepts full Google voice names or falls back to defaults. */
function resolveVoice(voiceId?: string): { languageCode: string; name: string } {
  if (voiceId && voiceId.match(/^[a-z]{2}-[A-Z]{2}-/)) {
    const languageCode = voiceId.split('-').slice(0, 2).join('-');
    return { languageCode, name: voiceId };
  }
  return { languageCode: 'en-US', name: DEFAULT_VOICE };
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  // --- JWT Authentication ---
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
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

  // --- Rate Limiting ---
  const serviceClient = createClient(
    SUPABASE_URL,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || SUPABASE_ANON_KEY,
  );
  const rateLimitResult = await checkRateLimit(serviceClient, `concierge-tts:${user.id}`, 20, 60);
  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_CLOUD_TTS_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'TTS service not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.speech_text) {
      return new Response(JSON.stringify({ error: 'speech_text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      speech_text,
      voice_id,
      output_format = 'mp3',
    } = body as {
      speech_text: string;
      voice_id?: string;
      output_format?: string;
    };

    if (speech_text.length > MAX_TEXT_CHARS) {
      return new Response(
        JSON.stringify({ error: `speech_text exceeds ${MAX_TEXT_CHARS} character limit` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { encoding, contentType } = resolveEncoding(output_format);
    const sampleRate = resolveSampleRate(output_format);
    const voice = resolveVoice(voice_id);

    // Build Google Cloud TTS request
    const ttsPayload = {
      input: { text: speech_text },
      voice: {
        languageCode: voice.languageCode,
        name: voice.name,
      },
      audioConfig: {
        audioEncoding: encoding,
        sampleRateHertz: sampleRate,
      },
    };

    let res = await fetch(GOOGLE_TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(ttsPayload),
    });

    // If primary voice fails, retry with fallback voice
    if (!res.ok && voice.name !== FALLBACK_VOICE) {
      console.warn(
        `Primary voice ${voice.name} failed (${res.status}), retrying with fallback ${FALLBACK_VOICE}`,
      );
      ttsPayload.voice = { languageCode: 'en-US', name: FALLBACK_VOICE };
      res = await fetch(GOOGLE_TTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(ttsPayload),
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google TTS error:', res.status, errText);
      return new Response(JSON.stringify({ error: 'TTS synthesis failed', status: res.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const audioContent: string = data.audioContent;

    if (!audioContent) {
      return new Response(JSON.stringify({ error: 'No audio content returned' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decode base64 audio → binary
    const raw = atob(audioContent);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i);
    }

    return new Response(bytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    console.error('concierge-tts error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
