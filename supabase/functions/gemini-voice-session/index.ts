import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { TripContextBuilder } from '../_shared/contextBuilder.ts';
import { buildSystemPrompt } from '../_shared/promptBuilder.ts';

// ── Vertex AI configuration ──
const VERTEX_PROJECT_ID = Deno.env.get('VERTEX_PROJECT_ID');
const VERTEX_LOCATION = Deno.env.get('VERTEX_LOCATION') || 'us-central1';
const VERTEX_SERVICE_ACCOUNT_KEY = Deno.env.get('VERTEX_SERVICE_ACCOUNT_KEY');

// Legacy AI Studio fallback (kept for rollback via VOICE_PROVIDER=ai_studio)
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const VOICE_PROVIDER = (Deno.env.get('VOICE_PROVIDER') || 'vertex').toLowerCase();

// GA model for Vertex AI Live API
const VERTEX_LIVE_MODEL = 'gemini-live-2.5-flash-native-audio';
// Legacy AI Studio model (only used if VOICE_PROVIDER=ai_studio)
const AI_STUDIO_LIVE_MODEL =
  Deno.env.get('GEMINI_LIVE_MODEL') || 'gemini-2.5-flash-native-audio-preview-12-2025';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const ALLOWED_VOICES = new Set(['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede']);
const DEFAULT_VOICE = 'Charon';

/** Function declarations for Gemini Live tool use */
const VOICE_FUNCTION_DECLARATIONS = [
  {
    name: 'addToCalendar',
    description: 'Add an event to the trip calendar',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Event title' },
        startTime: { type: 'STRING', description: 'ISO 8601 start time' },
        endTime: { type: 'STRING', description: 'ISO 8601 end time (optional)' },
        location: { type: 'STRING', description: 'Event location (optional)' },
        description: { type: 'STRING', description: 'Event description (optional)' },
      },
      required: ['title', 'startTime'],
    },
  },
  {
    name: 'createTask',
    description: 'Create a task for the trip group',
    parameters: {
      type: 'OBJECT',
      properties: {
        content: { type: 'STRING', description: 'Task description' },
        dueDate: { type: 'STRING', description: 'Due date in ISO format (optional)' },
      },
      required: ['content'],
    },
  },
  {
    name: 'createPoll',
    description: 'Create a poll for the group to vote on',
    parameters: {
      type: 'OBJECT',
      properties: {
        question: { type: 'STRING', description: 'Poll question' },
        options: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Poll options (2-6 choices)',
        },
      },
      required: ['question', 'options'],
    },
  },
  {
    name: 'searchPlaces',
    description: 'Search for nearby places like restaurants, hotels, or attractions',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Search query (e.g. "Italian restaurant")' },
        type: { type: 'STRING', description: 'Place type filter (optional)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getPaymentSummary',
    description: 'Get a summary of who owes money to whom in the trip',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'getDirectionsETA',
    description:
      'Get driving directions, travel time, and distance between two locations.',
    parameters: {
      type: 'OBJECT',
      properties: {
        origin: { type: 'STRING', description: 'Starting address or place name' },
        destination: { type: 'STRING', description: 'Destination address or place name' },
        departureTime: { type: 'STRING', description: 'Optional ISO 8601 departure time' },
      },
      required: ['origin', 'destination'],
    },
  },
  {
    name: 'getTimezone',
    description: 'Get the time zone for a geographic location.',
    parameters: {
      type: 'OBJECT',
      properties: {
        lat: { type: 'NUMBER', description: 'Latitude' },
        lng: { type: 'NUMBER', description: 'Longitude' },
      },
      required: ['lat', 'lng'],
    },
  },
  {
    name: 'getPlaceDetails',
    description: 'Get detailed info about a specific place.',
    parameters: {
      type: 'OBJECT',
      properties: {
        placeId: { type: 'STRING', description: 'Google Places ID' },
      },
      required: ['placeId'],
    },
  },
  {
    name: 'searchImages',
    description: 'Search for images on the web.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Image search query' },
        count: { type: 'NUMBER', description: 'Number of images (max 10, default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getStaticMapUrl',
    description: 'Generate a map image showing a location or route.',
    parameters: {
      type: 'OBJECT',
      properties: {
        center: { type: 'STRING', description: 'Address or "lat,lng"' },
        zoom: { type: 'NUMBER', description: 'Zoom level 1-20 (default 13)' },
        markers: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Marker locations' },
      },
      required: ['center'],
    },
  },
  {
    name: 'searchWeb',
    description: 'Search the web for real-time information.',
    parameters: {
      type: 'OBJECT',
      properties: { query: { type: 'STRING', description: 'Search query' } },
      required: ['query'],
    },
  },
  {
    name: 'getDistanceMatrix',
    description: 'Get travel times and distances from multiple origins to multiple destinations.',
    parameters: {
      type: 'OBJECT',
      properties: {
        origins: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Starting addresses' },
        destinations: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Destination addresses' },
        mode: { type: 'STRING', description: 'Travel mode: driving, walking, bicycling, transit' },
      },
      required: ['origins', 'destinations'],
    },
  },
  {
    name: 'validateAddress',
    description: 'Validate and clean up an address.',
    parameters: {
      type: 'OBJECT',
      properties: { address: { type: 'STRING', description: 'Address to validate' } },
      required: ['address'],
    },
  },
  {
    name: 'updateCalendarEvent',
    description: 'Update an existing trip calendar event.',
    parameters: {
      type: 'OBJECT',
      properties: {
        eventId: { type: 'STRING', description: 'ID of the event to update' },
        title: { type: 'STRING', description: 'New event title' },
        datetime: { type: 'STRING', description: 'New start time in ISO 8601' },
        endDatetime: { type: 'STRING', description: 'New end time in ISO 8601' },
        location: { type: 'STRING', description: 'New location' },
        notes: { type: 'STRING', description: 'New description' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'deleteCalendarEvent',
    description: 'Delete an event from the trip calendar.',
    parameters: {
      type: 'OBJECT',
      properties: { eventId: { type: 'STRING', description: 'ID of the event to delete' } },
      required: ['eventId'],
    },
  },
  {
    name: 'updateTask',
    description: 'Update an existing trip task.',
    parameters: {
      type: 'OBJECT',
      properties: {
        taskId: { type: 'STRING', description: 'ID of the task' },
        title: { type: 'STRING', description: 'New title' },
        completed: { type: 'BOOLEAN', description: 'Set true to mark complete' },
        dueDate: { type: 'STRING', description: 'New due date' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'deleteTask',
    description: 'Delete a task from the trip.',
    parameters: {
      type: 'OBJECT',
      properties: { taskId: { type: 'STRING', description: 'ID of the task' } },
      required: ['taskId'],
    },
  },
  {
    name: 'searchTripData',
    description: 'Search across all trip data.',
    parameters: {
      type: 'OBJECT',
      properties: { query: { type: 'STRING', description: 'Search query' } },
      required: ['query'],
    },
  },
  {
    name: 'detectCalendarConflicts',
    description: 'Check if a time slot conflicts with existing events.',
    parameters: {
      type: 'OBJECT',
      properties: {
        datetime: { type: 'STRING', description: 'Proposed time in ISO 8601' },
        endDatetime: { type: 'STRING', description: 'Proposed end time' },
      },
      required: ['datetime'],
    },
  },
  {
    name: 'createBroadcast',
    description: 'Send a broadcast to all trip members.',
    parameters: {
      type: 'OBJECT',
      properties: {
        message: { type: 'STRING', description: 'Broadcast message' },
        priority: { type: 'STRING', description: '"normal" or "urgent"' },
      },
      required: ['message'],
    },
  },
  {
    name: 'getWeatherForecast',
    description: 'Get weather forecast.',
    parameters: {
      type: 'OBJECT',
      properties: {
        location: { type: 'STRING', description: 'City or location' },
        date: { type: 'STRING', description: 'Date for forecast' },
      },
      required: ['location'],
    },
  },
  {
    name: 'convertCurrency',
    description: 'Convert between currencies with live rates.',
    parameters: {
      type: 'OBJECT',
      properties: {
        amount: { type: 'NUMBER', description: 'Amount to convert' },
        from: { type: 'STRING', description: 'Source currency code' },
        to: { type: 'STRING', description: 'Target currency code' },
      },
      required: ['amount', 'from', 'to'],
    },
  },
  {
    name: 'browseWebsite',
    description: 'Browse a website to extract travel info.',
    parameters: {
      type: 'OBJECT',
      properties: {
        url: { type: 'STRING', description: 'Full URL' },
        instruction: { type: 'STRING', description: 'What to look for' },
      },
      required: ['url'],
    },
  },
  {
    name: 'makeReservation',
    description: 'Research and prepare a reservation.',
    parameters: {
      type: 'OBJECT',
      properties: {
        venue: { type: 'STRING', description: 'Venue name' },
        datetime: { type: 'STRING', description: 'Desired date/time' },
        partySize: { type: 'NUMBER', description: 'Number of guests' },
        name: { type: 'STRING', description: 'Name for the reservation' },
        specialRequests: { type: 'STRING', description: 'Special requests' },
      },
      required: ['venue'],
    },
  },
  {
    name: 'settleExpense',
    description: 'Mark a payment split as settled.',
    parameters: {
      type: 'OBJECT',
      properties: {
        splitId: { type: 'STRING', description: 'ID of the payment split' },
        method: { type: 'STRING', description: 'Payment method used' },
      },
      required: ['splitId'],
    },
  },
  {
    name: 'generateTripImage',
    description: 'Generate a custom AI image for the trip.',
    parameters: {
      type: 'OBJECT',
      properties: {
        prompt: { type: 'STRING', description: 'Image description' },
        style: { type: 'STRING', description: 'Style: photo, illustration, watercolor, minimal, vibrant' },
      },
      required: ['prompt'],
    },
  },
];

/** Voice-specific addendum appended to the full system prompt */
const VOICE_ADDENDUM = `

=== VOICE DELIVERY GUIDELINES ===
You are now speaking via full-screen immersive bidirectional audio conversation mode.
Take over the user's entire screen during this active conversation to optimize audio
input and output handling. Display conversation text in real-time as the user speaks
and you respond, maintaining visual context of the exchange.

Adapt your responses for voice:
- Keep responses under 3 sentences unless the user asks for detail
- Use natural conversational language — NO markdown, NO links, NO bullet points, NO formatting
- Say numbers as words when natural ("about twenty dollars" not "0.00")
- Avoid lists — narrate sequentially instead
- Be warm, concise, and personable
- If you don't know something specific, say so briefly and suggest checking the app
- When executing actions (adding events, creating tasks), confirm what you did conversationally

=== VISUAL CARDS IN CHAT ===
When you call these tools, a visual card automatically appears in the chat window
(visible when the user exits voice mode):
- searchPlaces / getPlaceDetails → photos, ratings, and a Maps link appear in chat.
- getStaticMapUrl → a map image appears in chat.
- getDirectionsETA → a directions card with a Maps link appears in chat.
- searchImages → images appear in chat.
- searchWeb → source links appear in chat.
- getDistanceMatrix → a travel time comparison appears in chat.
- validateAddress → no visual card; just confirm the address verbally.
Never speak URLs or markdown. The chat handles the visual output automatically.`;

// ── Vertex AI OAuth2 token minting from Service Account ──

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

async function createVertexAccessToken(saKey: ServiceAccountKey): Promise<string> {
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

  // Import RSA private key
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

  // Exchange JWT for access token
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

// ── Legacy AI Studio ephemeral token (kept for rollback) ──

const parseEnvInt = (
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
};

const GEMINI_EPHEMERAL_EXPIRE_MINUTES = parseEnvInt(
  Deno.env.get('GEMINI_EPHEMERAL_EXPIRE_MINUTES'), 30, 1, 20 * 60,
);
const GEMINI_EPHEMERAL_NEW_SESSION_EXPIRE_SECONDS = parseEnvInt(
  Deno.env.get('GEMINI_EPHEMERAL_NEW_SESSION_EXPIRE_SECONDS'), 120, 10, 20 * 60 * 60,
);
const GEMINI_EPHEMERAL_USES = parseEnvInt(Deno.env.get('GEMINI_EPHEMERAL_USES'), 1, 0, 100);

async function createAiStudioEphemeralToken(params: {
  model: string;
  systemInstruction: string;
  voice: string;
}): Promise<{ token: string; expireTime?: string; newSessionExpireTime?: string }> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const now = Date.now();
  const expireTime = new Date(now + GEMINI_EPHEMERAL_EXPIRE_MINUTES * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(now + GEMINI_EPHEMERAL_NEW_SESSION_EXPIRE_SECONDS * 1000).toISOString();

  const tokenRequestBody = {
    uses: GEMINI_EPHEMERAL_USES,
    expireTime,
    newSessionExpireTime,
    liveConnectConstraints: {
      model: params.model,
      config: {
        responseModalities: ['AUDIO', 'TEXT'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: params.voice } },
        },
        systemInstruction: { parts: [{ text: params.systemInstruction }] },
        tools: [{ functionDeclarations: VOICE_FUNCTION_DECLARATIONS }],
      },
    },
  };

  const tokenResponse = await fetch(
    'https://generativelanguage.googleapis.com/v1alpha/auth_tokens',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify(tokenRequestBody),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(`AI Studio token failed (${tokenResponse.status}): ${body.substring(0, 400)}`);
  }

  const tokenData = await tokenResponse.json();
  const tokenName = tokenData?.name;
  if (typeof tokenName !== 'string' || !tokenName.trim()) {
    throw new Error('AI Studio auth_tokens returned empty token');
  }

  return { token: tokenName, expireTime, newSessionExpireTime };
}

// ── Main handler ──

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const useVertex = VOICE_PROVIDER !== 'ai_studio';
  const currentModel = useVertex ? VERTEX_LIVE_MODEL : AI_STUDIO_LIVE_MODEL;
  const isVertexConfigured = !!(VERTEX_PROJECT_ID && VERTEX_SERVICE_ACCOUNT_KEY);

  // Health check
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        service: 'gemini-voice-session',
        provider: useVertex ? 'vertex' : 'ai_studio',
        configured: useVertex ? isVertexConfigured : !!GEMINI_API_KEY,
        model: currentModel,
        voice: DEFAULT_VOICE,
        location: useVertex ? VERTEX_LOCATION : null,
        features: {
          proactiveAudio: useVertex,
          affectiveDialog: useVertex,
          grounding: useVertex,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  }

  try {
    const requestId = crypto.randomUUID().slice(0, 8);
    const t0 = Date.now();
    const tag = `[gemini-voice-session:${requestId}]`;

    let bodyRaw: Record<string, unknown> = {};
    try {
      bodyRaw = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessionAttemptId =
      typeof bodyRaw?.sessionAttemptId === 'string' ? bodyRaw.sessionAttemptId : 'unknown';
    console.log(`${tag} handler_enter`, {
      sessionAttemptId, provider: useVertex ? 'vertex' : 'ai_studio',
      model: currentModel, origin: req.headers.get('origin'), t0,
    });

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );

    if (authError || !user) {
      console.warn(`${tag} Auth failed`, { sessionAttemptId, error: authError?.message });
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`${tag} Authenticated`, { userId: user.id, sessionAttemptId, elapsedMs: Date.now() - t0 });

    const requestedVoice = typeof bodyRaw?.voice === 'string' ? bodyRaw.voice : DEFAULT_VOICE;
    const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : DEFAULT_VOICE;
    const tripId = typeof bodyRaw?.tripId === 'string' ? bodyRaw.tripId : undefined;

    // Build system instruction
    let systemInstruction: string;
    if (tripId) {
      try {
        const contextTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('context_build_timeout')), 15_000),
        );
        const tripContext = await Promise.race([
          TripContextBuilder.buildContextWithCache(tripId, user.id, authHeader, true),
          contextTimeout,
        ]);
        systemInstruction = buildSystemPrompt(tripContext);
        console.log(`${tag} Context built`, { elapsedMs: Date.now() - t0 });
      } catch (contextError) {
        const errMsg = contextError instanceof Error ? contextError.message : String(contextError);
        console.warn(`${tag} Context failed: ${errMsg}. Using minimal prompt.`);
        systemInstruction = `You are Chravel Concierge, a helpful AI travel assistant. Current date: ${new Date().toISOString().split('T')[0]}.`;
      }
    } else {
      systemInstruction = `You are Chravel Concierge, a helpful AI travel assistant. Current date: ${new Date().toISOString().split('T')[0]}.`;
    }
    systemInstruction += VOICE_ADDENDUM;

    // ── VERTEX AI PATH ──
    if (useVertex) {
      if (!VERTEX_PROJECT_ID || !VERTEX_SERVICE_ACCOUNT_KEY) {
        throw new Error(
          'Vertex AI not configured. Set VERTEX_PROJECT_ID, VERTEX_LOCATION, and VERTEX_SERVICE_ACCOUNT_KEY in Supabase Edge Function secrets.',
        );
      }

      console.log(`${tag} Creating Vertex OAuth2 token`, {
        projectId: VERTEX_PROJECT_ID,
        location: VERTEX_LOCATION,
        model: VERTEX_LIVE_MODEL,
        voice,
        elapsedMs: Date.now() - t0,
      });

      const saKey = parseServiceAccountKey(VERTEX_SERVICE_ACCOUNT_KEY);
      const tokenT0 = Date.now();
      const accessToken = await createVertexAccessToken(saKey);

      console.log(`${tag} Vertex token created`, {
        tokenMs: Date.now() - tokenT0,
        totalMs: Date.now() - t0,
      });

      // Vertex Live API WebSocket URL
      const websocketUrl = `wss://${VERTEX_LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;

      // Build the BidiGenerateContentSetup message that the client sends as first WS message
      const setupMessage = {
        setup: {
          model: `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_LIVE_MODEL}`,
          generationConfig: {
            responseModalities: ['AUDIO', 'TEXT'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice,
                },
              },
            },
            realtimeInputConfig: {
              automaticActivityDetection: {
                startOfSpeechSensitivity: 'START_OF_SPEECH_SENSITIVITY_LOW',
                endOfSpeechSensitivity: 'END_OF_SPEECH_SENSITIVITY_HIGH',
              },
            },
          },
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          tools: [
            { functionDeclarations: VOICE_FUNCTION_DECLARATIONS },
            { googleSearch: {} },
          ],
          // Vertex-specific: enable proactive audio + affective dialog
          realtimeInputConfig: {
            automaticActivityDetection: {
              startOfSpeechSensitivity: 'START_OF_SPEECH_SENSITIVITY_LOW',
              endOfSpeechSensitivity: 'END_OF_SPEECH_SENSITIVITY_HIGH',
            },
          },
          outputAudioTranscript: {},
          inputAudioTranscript: {},
        },
      };

      return new Response(
        JSON.stringify({
          accessToken,
          model: VERTEX_LIVE_MODEL,
          voice,
          provider: 'vertex',
          websocketUrl,
          setupMessage,
          features: {
            proactiveAudio: true,
            affectiveDialog: true,
            grounding: true,
          },
          _rid: requestId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    // ── AI STUDIO FALLBACK PATH ──
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

    console.log(`${tag} Creating AI Studio ephemeral token`, {
      model: AI_STUDIO_LIVE_MODEL, voice, elapsedMs: Date.now() - t0,
    });

    const tokenT0 = Date.now();
    const ephemeral = await createAiStudioEphemeralToken({
      model: AI_STUDIO_LIVE_MODEL,
      systemInstruction,
      voice,
    });

    console.log(`${tag} AI Studio token created`, {
      tokenMs: Date.now() - tokenT0,
      totalMs: Date.now() - t0,
    });

    const CONSTRAINED_WS_URL =
      'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';

    return new Response(
      JSON.stringify({
        accessToken: ephemeral.token,
        accessTokenExpiresAt: ephemeral.expireTime ?? null,
        newSessionExpiresAt: ephemeral.newSessionExpireTime ?? null,
        model: AI_STUDIO_LIVE_MODEL,
        voice,
        provider: 'ai_studio',
        websocketUrl: CONSTRAINED_WS_URL,
        _rid: requestId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('gemini-voice-session error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
