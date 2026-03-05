import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/security.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const DEFAULT_VOICE = 'en-US-Neural2-J';
const FALLBACK_VOICE = 'en-US-Wavenet-D';
const MAX_TEXT_CHARS = 1500;

// ── OAuth2 Service Account helpers ──

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

function base64UrlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ── Module-level token cache (persists across warm invocations) ──
let cachedAccessToken: string | null = null;
let cachedTokenExpiry = 0;

async function getAccessToken(saKey: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  // Re-use cached token if it has >60s remaining
  if (cachedAccessToken && cachedTokenExpiry > now + 60) {
    return cachedAccessToken;
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const expiry = now + 3600;
  const payload = {
    iss: saKey.client_email,
    sub: saKey.client_email,
    aud: saKey.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: expiry,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  };

  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const pemBody = saKey.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const keyBuffer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    enc.encode(signingInput),
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  const jwt = `${signingInput}.${signatureB64}`;

  const tokenUri = saKey.token_uri || 'https://oauth2.googleapis.com/token';
  const tokenResp = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    signal: AbortSignal.timeout(15_000),
  });

  if (!tokenResp.ok) {
    const body = await tokenResp.text();
    throw new Error(
      `OAuth2 token exchange failed (${tokenResp.status}): ${body.substring(0, 400)}`,
    );
  }

  const tokenData = await tokenResp.json();
  if (!tokenData.access_token) {
    throw new Error('OAuth2 response missing access_token');
  }

  // Cache the token
  cachedAccessToken = tokenData.access_token;
  cachedTokenExpiry = expiry;

  return cachedAccessToken!;
}

function parseServiceAccountKey(base64Key: string): ServiceAccountKey {
  try {
    const json = atob(base64Key);
    const parsed = JSON.parse(json);
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error('Missing client_email or private_key in service account JSON');
    }
    return parsed;
  } catch (e) {
    throw new Error(
      `Invalid VERTEX_SERVICE_ACCOUNT_KEY: ${e instanceof Error ? e.message : 'parse failed'}. ` +
        'Ensure the value is base64-encoded JSON of the service account key file.',
    );
  }
}

// ── TTS helpers ──

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

function resolveSampleRate(format: string): number {
  const match = format.match(/_(\d{4,6})_/);
  return match ? Number(match[1]) : 24000;
}

function resolveVoice(voiceId?: string): { languageCode: string; name: string } {
  if (voiceId && voiceId.match(/^[a-z]{2}-[A-Z]{2}-/)) {
    const languageCode = voiceId.split('-').slice(0, 2).join('-');
    return { languageCode, name: voiceId };
  }
  return { languageCode: 'en-US', name: DEFAULT_VOICE };
}

// ── Module-level parsed SA key cache ──
let cachedSaKey: ServiceAccountKey | null = null;

// ── Main handler ──

Deno.serve(async (req: Request) => {
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
    const saKeyRaw = Deno.env.get('VERTEX_SERVICE_ACCOUNT_KEY');
    if (!saKeyRaw) {
      return new Response(
        JSON.stringify({ error: 'TTS service not configured (missing service account)' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
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

    // Parse SA key once, cache for warm invocations
    if (!cachedSaKey) {
      cachedSaKey = parseServiceAccountKey(saKeyRaw);
    }

    // Get cached or fresh OAuth2 access token
    const accessToken = await getAccessToken(cachedSaKey);

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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(ttsPayload),
    });

    // If primary voice fails, retry with fallback voice
    let usedFallback = false;
    if (!res.ok && voice.name !== FALLBACK_VOICE) {
      console.warn(
        `Primary voice ${voice.name} failed (${res.status}), retrying with fallback ${FALLBACK_VOICE}`,
      );
      ttsPayload.voice = { languageCode: 'en-US', name: FALLBACK_VOICE };
      res = await fetch(GOOGLE_TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(ttsPayload),
      });
      usedFallback = true;
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google TTS error:', res.status, errText);

      // If 401/403, invalidate cached token for next request
      if (res.status === 401 || res.status === 403) {
        cachedAccessToken = null;
        cachedTokenExpiry = 0;
      }

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

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    };

    if (usedFallback) {
      responseHeaders['x-voice-fallback'] = 'true';
    }

    return new Response(bytes.buffer as ArrayBuffer, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error('concierge-tts error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
