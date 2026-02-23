import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { TripContextBuilder } from '../_shared/contextBuilder.ts';
import { buildSystemPrompt } from '../_shared/promptBuilder.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
// Using gemini-2.0-flash-exp as the stable default for Live API (bidirectional audio)
const GEMINI_LIVE_MODEL = Deno.env.get('GEMINI_LIVE_MODEL') || 'models/gemini-2.0-flash-exp';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const ALLOWED_VOICES = new Set(['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede']);
// Ephemeral tokens MUST use BidiGenerateContentConstrained (not BidiGenerateContent).
// BidiGenerateContent expects ?key=<API_KEY>; BidiGenerateContentConstrained expects
// ?access_token=<EPHEMERAL_TOKEN>. Using the wrong endpoint causes auth failures
// ("unregistered callers" / 403 / silent WS close).
const LIVE_WEBSOCKET_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';

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
  Deno.env.get('GEMINI_EPHEMERAL_EXPIRE_MINUTES'),
  30,
  1,
  20 * 60,
);
const GEMINI_EPHEMERAL_NEW_SESSION_EXPIRE_SECONDS = parseEnvInt(
  Deno.env.get('GEMINI_EPHEMERAL_NEW_SESSION_EXPIRE_SECONDS'),
  60,
  10,
  20 * 60 * 60,
);
const GEMINI_EPHEMERAL_USES = parseEnvInt(Deno.env.get('GEMINI_EPHEMERAL_USES'), 1, 0, 100);

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
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'getDirectionsETA',
    description:
      'Get driving directions, travel time, and distance between two locations. Use for "how long to get there", "how far is it", or "directions from X to Y" questions.',
    parameters: {
      type: 'OBJECT',
      properties: {
        origin: { type: 'STRING', description: 'Starting address or place name' },
        destination: { type: 'STRING', description: 'Destination address or place name' },
        departureTime: {
          type: 'STRING',
          description: 'Optional ISO 8601 departure time for traffic-aware ETA',
        },
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
    description:
      'Get detailed info about a specific place: hours, phone, website, editorial summary, and photos. Use after searchPlaces or when the user asks for more details about a venue.',
    parameters: {
      type: 'OBJECT',
      properties: {
        placeId: {
          type: 'STRING',
          description: 'Google Places ID from a previous searchPlaces result',
        },
      },
      required: ['placeId'],
    },
  },
  {
    name: 'searchImages',
    description:
      'Search for images on the web. Use when the user asks to see pictures of something that is NOT a specific venue — for venue photos use getPlaceDetails instead.',
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
    description:
      'Generate a map image showing a location or route and display it in the chat. Use after giving directions or when the user wants to see where something is on a map.',
    parameters: {
      type: 'OBJECT',
      properties: {
        center: {
          type: 'STRING',
          description: 'Address or "lat,lng" to center the map on',
        },
        zoom: {
          type: 'NUMBER',
          description: 'Zoom level 1-20 (default 13; use 12 for city, 15 for walking)',
        },
        markers: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Marker locations as addresses or "lat,lng" strings',
        },
      },
      required: ['center'],
    },
  },
  {
    name: 'searchWeb',
    description:
      'Search the web for real-time information: current business hours, prices, reviews, upcoming events, or anything requiring live data beyond your knowledge cutoff.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getDistanceMatrix',
    description:
      'Get travel times and distances from multiple origins to multiple destinations. Use for "how long to get from hotel to each restaurant" or comparing multiple locations.',
    parameters: {
      type: 'OBJECT',
      properties: {
        origins: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Starting addresses or place names',
        },
        destinations: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Destination addresses or place names',
        },
        mode: {
          type: 'STRING',
          description: 'Travel mode: driving (default), walking, bicycling, or transit',
        },
      },
      required: ['origins', 'destinations'],
    },
  },
  {
    name: 'validateAddress',
    description:
      'Validate and clean up an address the user mentioned, and get its exact coordinates. Use when a user dictates an address or asks if an address is correct.',
    parameters: {
      type: 'OBJECT',
      properties: {
        address: { type: 'STRING', description: 'Address to validate and geocode' },
      },
      required: ['address'],
    },
  },
];

// Feature flag: enable native Google Search grounding in voice alongside function declarations.
// gemini-2.0-flash-exp supports this; text-only flash models do not.
// Set ENABLE_VOICE_GROUNDING=false in Supabase secrets to disable if the model rejects it.
const ENABLE_VOICE_GROUNDING =
  (Deno.env.get('ENABLE_VOICE_GROUNDING') || 'true').toLowerCase() !== 'false';

/** Voice-specific addendum appended to the full system prompt */
const VOICE_ADDENDUM = `

=== VOICE DELIVERY GUIDELINES ===
You are now speaking via bidirectional voice audio. Adapt your responses:
- Keep responses under 3 sentences unless the user asks for detail
- Use natural conversational language — NO markdown, NO links, NO bullet points, NO formatting
- Say numbers as words when natural ("about twenty dollars" not "0.00")
- Avoid lists — narrate sequentially instead
- Be warm, concise, and personable
- If you don't know something specific, say so briefly and suggest checking the app
- When executing actions (adding events, creating tasks), confirm what you did conversationally

=== VISUAL CARDS IN CHAT ===
When you call these tools, a visual card automatically appears in the chat window:
- searchPlaces / getPlaceDetails → photos, ratings, and a Maps link appear in chat. Say: "I've shared photos in our chat" then describe the top result verbally.
- getStaticMapUrl → a map image appears in chat. Say: "I've dropped a map in our chat for you."
- getDirectionsETA → a directions card with a Maps link appears in chat. Say the drive time aloud and mention: "I've added a link in chat to open it in Maps."
- searchImages → images appear in chat. Say: "I've pulled up some images in our chat."
- searchWeb → source links appear in chat. Summarize 1-2 key facts aloud and say: "Check the chat for the source links."
- getDistanceMatrix → a travel time comparison appears in chat. Read out the key times aloud and say: "I've shared a comparison in the chat."
- validateAddress → no visual card; just confirm the cleaned-up address and coordinates verbally.
Never speak URLs or markdown. The chat handles the visual output automatically.`;

async function createEphemeralToken(params: {
  model: string;
  systemInstruction: string;
  voice: string;
}): Promise<{ token: string; expireTime?: string; newSessionExpireTime?: string }> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const now = Date.now();
  const expireTime = new Date(now + GEMINI_EPHEMERAL_EXPIRE_MINUTES * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(
    now + GEMINI_EPHEMERAL_NEW_SESSION_EXPIRE_SECONDS * 1000,
  ).toISOString();

  const tokenRequestBody = {
    uses: GEMINI_EPHEMERAL_USES,
    expireTime,
    newSessionExpireTime,
    bidiGenerateContentSetup: {
      model: params.model,
      generationConfig: {
        responseModalities: ['AUDIO', 'TEXT'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: params.voice,
            },
          },
        },
      },
      systemInstruction: {
        parts: [{ text: params.systemInstruction }],
      },
      tools: [
        { functionDeclarations: VOICE_FUNCTION_DECLARATIONS },
        // Native Google Search grounding — lets the model cite live web info directly.
        // Only supported by gemini-2.0-flash-exp and newer Live models.
        // Falls back gracefully if unsupported (token request will fail with 400; handled below).
        ...(ENABLE_VOICE_GROUNDING ? [{ googleSearch: {} }] : []),
      ],
    },
  };

  // Use x-goog-api-key header (preferred for server-side) — some proxies/logging strip ?key=
  const tokenResponse = await fetch(
    'https://generativelanguage.googleapis.com/v1alpha/auth_tokens',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify(tokenRequestBody),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    let parsed: { error?: { message?: string } } = {};
    try {
      parsed = JSON.parse(body);
    } catch {
      /* use raw body */
    }
    const errMsg = parsed?.error?.message || body;
    // Map "unregistered callers" to actionable message for operators
    if (tokenResponse.status === 403 && errMsg.toLowerCase().includes('unregistered callers')) {
      throw new Error(
        'GEMINI_API_KEY is missing, invalid, or has API restrictions (e.g. HTTP referrer) that block server-side requests. ' +
          'Set GEMINI_API_KEY in Supabase Dashboard → Project Settings → Edge Functions → Secrets. ' +
          'If using key restrictions, ensure server IPs are allowed.',
      );
    }
    throw new Error(
      `Failed to create Gemini ephemeral token (${tokenResponse.status}): ${errMsg.substring(0, 400)}`,
    );
  }

  const tokenData = await tokenResponse.json();
  const tokenName = tokenData?.name;
  if (typeof tokenName !== 'string' || tokenName.trim().length === 0) {
    throw new Error('Gemini auth_tokens.create returned an empty token');
  }

  return {
    token: tokenName,
    expireTime: tokenData?.expireTime,
    newSessionExpireTime: tokenData?.newSessionExpireTime,
  };
}

/** Retry variant of createEphemeralToken that omits Google Search grounding. */
async function createEphemeralTokenWithoutGrounding(params: {
  model: string;
  systemInstruction: string;
  voice: string;
}): Promise<{ token: string; expireTime?: string; newSessionExpireTime?: string }> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const now = Date.now();
  const expireTime = new Date(now + GEMINI_EPHEMERAL_EXPIRE_MINUTES * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(
    now + GEMINI_EPHEMERAL_NEW_SESSION_EXPIRE_SECONDS * 1000,
  ).toISOString();

  const tokenRequestBody = {
    uses: GEMINI_EPHEMERAL_USES,
    expireTime,
    newSessionExpireTime,
    bidiGenerateContentSetup: {
      model: params.model,
      generationConfig: {
        responseModalities: ['AUDIO', 'TEXT'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: params.voice,
            },
          },
        },
      },
      systemInstruction: {
        parts: [{ text: params.systemInstruction }],
      },
      tools: [{ functionDeclarations: VOICE_FUNCTION_DECLARATIONS }],
    },
  };

  const tokenResponse = await fetch(
    'https://generativelanguage.googleapis.com/v1alpha/auth_tokens',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify(tokenRequestBody),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(
      `Token creation failed (no grounding) (${tokenResponse.status}): ${body.substring(0, 400)}`,
    );
  }

  const tokenData = await tokenResponse.json();
  const tokenName = tokenData?.name;
  if (typeof tokenName !== 'string' || tokenName.trim().length === 0) {
    throw new Error('Gemini auth_tokens.create returned an empty token (no grounding retry)');
  }

  return {
    token: tokenName,
    expireTime: tokenData?.expireTime,
    newSessionExpireTime: tokenData?.newSessionExpireTime,
  };
}

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health/diagnostic check: GET returns config status (no auth required)
  // Use this to verify GEMINI_API_KEY is set in Supabase secrets.
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        service: 'gemini-voice-session',
        configured: !!GEMINI_API_KEY,
        model: GEMINI_LIVE_MODEL,
        message: GEMINI_API_KEY
          ? 'GEMINI_API_KEY is set. Voice sessions should work.'
          : 'GEMINI_API_KEY not set. Add it in Supabase Dashboard → Project Settings → Edge Functions → Secrets, then redeploy.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
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
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : supabase;
    // Voice is free for all authenticated users — no subscription gate
    console.log('[gemini-voice-session] Authenticated user, proceeding', { userId: user.id });

    const body = await req.json();
    const requestedVoice = typeof body?.voice === 'string' ? body.voice : 'Puck';
    const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : 'Puck';
    const tripId = typeof body?.tripId === 'string' ? body.tripId : undefined;

    // Build full system instruction using shared context builder + prompt builder
    let systemInstruction: string;

    if (tripId) {
      try {
        // Voice is pro-only (checked above), so always include preferences
        const tripContext = await TripContextBuilder.buildContextWithCache(
          tripId,
          user.id,
          authHeader,
          true,
        );
        systemInstruction = buildSystemPrompt(tripContext);
      } catch (contextError) {
        console.error(
          '[gemini-voice-session] Failed to build full context, using minimal:',
          contextError,
        );
        systemInstruction = `You are Chravel Concierge, a helpful AI travel assistant. Current date: ${new Date().toISOString().split('T')[0]}.`;
      }
    } else {
      systemInstruction = `You are Chravel Concierge, a helpful AI travel assistant. Current date: ${new Date().toISOString().split('T')[0]}.`;
    }

    // Append voice-specific delivery guidelines
    systemInstruction += VOICE_ADDENDUM;

    console.log('[gemini-voice-session] Creating ephemeral token', {
      model: GEMINI_LIVE_MODEL,
      voice,
      toolCount: VOICE_FUNCTION_DECLARATIONS.length,
      hasTripContext: !!tripId,
    });

    let ephemeral: { token: string; expireTime?: string; newSessionExpireTime?: string };
    try {
      ephemeral = await createEphemeralToken({
        model: GEMINI_LIVE_MODEL,
        systemInstruction,
        voice,
      });
      console.log('[gemini-voice-session] Token created successfully', {
        expireTime: ephemeral.expireTime,
        websocketUrl: LIVE_WEBSOCKET_URL,
      });
    } catch (tokenErr) {
      const tokenErrMsg = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
      console.error('[gemini-voice-session] Token creation failed', { error: tokenErrMsg });

      // If the model does not support Google Search grounding alongside function
      // declarations, retry once without grounding. Some Gemini Live models reject
      // the combination with a 400 or 500 status.
      if (ENABLE_VOICE_GROUNDING && tokenErrMsg.includes('400')) {
        console.warn(
          '[gemini-voice-session] Retrying token creation without Google Search grounding',
        );
        try {
          ephemeral = await createEphemeralTokenWithoutGrounding({
            model: GEMINI_LIVE_MODEL,
            systemInstruction,
            voice,
          });
          console.log('[gemini-voice-session] Token created (no grounding) successfully');
        } catch (retryErr) {
          console.error('[gemini-voice-session] Retry without grounding also failed', {
            error: retryErr instanceof Error ? retryErr.message : String(retryErr),
          });
          throw retryErr;
        }
      } else {
        throw tokenErr;
      }
    }

    // SECURITY: The response MUST only contain the ephemeral accessToken, NEVER
    // the raw GEMINI_API_KEY. The client connects to the WebSocket using
    // ?access_token=<ephemeral> which expires after GEMINI_EPHEMERAL_EXPIRE_MINUTES.
    // DO NOT add an apiKey field here — it would expose the secret to every user.
    return new Response(
      JSON.stringify({
        accessToken: ephemeral.token,
        accessTokenExpiresAt: ephemeral.expireTime ?? null,
        newSessionExpiresAt: ephemeral.newSessionExpireTime ?? null,
        model: GEMINI_LIVE_MODEL,
        voice,
        websocketUrl: LIVE_WEBSOCKET_URL,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('gemini-voice-session error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
