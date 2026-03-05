import { getCorsHeaders } from '../_shared/cors.ts';

const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const DEFAULT_VOICE = 'en-US-Neural2-J';
const FALLBACK_VOICE = 'en-US-Wavenet-D';

// ── OAuth2 Service Account helpers (same pattern as gemini-voice-session) ──

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

async function createAccessToken(saKey: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: saKey.client_email,
    sub: saKey.client_email,
    aud: saKey.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
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
    throw new Error(`OAuth2 token exchange failed (${tokenResp.status}): ${body.substring(0, 400)}`);
  }

  const tokenData = await tokenResp.json();
  if (!tokenData.access_token) {
    throw new Error('OAuth2 response missing access_token');
  }
  return tokenData.access_token;
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

// ── Main handler ──

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Use service account OAuth2 instead of API key
    const saKeyRaw = Deno.env.get('VERTEX_SERVICE_ACCOUNT_KEY');
    if (!saKeyRaw) {
      return new Response(
        JSON.stringify({ error: 'TTS service not configured (missing service account)' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.speech_text) {
      return new Response(
        JSON.stringify({ error: 'speech_text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { speech_text, voice_id, output_format = 'mp3' } = body as {
      speech_text: string;
      voice_id?: string;
      output_format?: string;
    };

    if (speech_text.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'speech_text exceeds 5000 character limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { encoding, contentType } = resolveEncoding(output_format);
    const sampleRate = resolveSampleRate(output_format);
    const voice = resolveVoice(voice_id);

    // Mint OAuth2 access token from service account
    const saKey = parseServiceAccountKey(saKeyRaw);
    const accessToken = await createAccessToken(saKey);

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
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(ttsPayload),
    });

    // If primary voice fails, retry with fallback voice
    if (!res.ok && voice.name !== FALLBACK_VOICE) {
      console.warn(`Primary voice ${voice.name} failed (${res.status}), retrying with fallback ${FALLBACK_VOICE}`);
      ttsPayload.voice = { languageCode: 'en-US', name: FALLBACK_VOICE };
      res = await fetch(GOOGLE_TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(ttsPayload),
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google TTS error:', res.status, errText);
      return new Response(
        JSON.stringify({ error: 'TTS synthesis failed', status: res.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const data = await res.json();
    const audioContent: string = data.audioContent;

    if (!audioContent) {
      return new Response(
        JSON.stringify({ error: 'No audio content returned' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
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
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
