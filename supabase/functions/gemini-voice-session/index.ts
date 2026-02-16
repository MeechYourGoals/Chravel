import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { TripContextBuilder } from '../_shared/contextBuilder.ts';
import { buildSystemPrompt } from '../_shared/promptBuilder.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_LIVE_MODEL =
  Deno.env.get('GEMINI_LIVE_MODEL') || 'models/gemini-2.5-flash-native-audio-preview-12-2025';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const ALLOWED_VOICES = new Set(['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede']);
const LIVE_WEBSOCKET_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

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
];

/** Voice-specific addendum appended to the full system prompt */
const VOICE_ADDENDUM = `

=== VOICE DELIVERY GUIDELINES ===
You are now speaking via bidirectional voice audio. Adapt your responses:
- Keep responses under 3 sentences unless the user asks for detail
- Use natural conversational language — NO markdown, NO links, NO bullet points, NO formatting
- Say numbers as words when natural ("about twenty dollars" not "$20.00")
- Avoid lists — narrate sequentially instead
- Be warm, concise, and personable
- If you don't know something specific, say so briefly and suggest checking the app
- For places, say the name and a brief description — don't try to give URLs
- When executing actions (adding events, creating tasks), confirm what you did conversationally`;

async function canUseVoiceConcierge(supabaseAdmin: any, userId: string): Promise<boolean> {
  const [{ data: entitlements, error: entitlementsError }, { data: roles, error: rolesError }] =
    await Promise.all([
      supabaseAdmin
        .from('user_entitlements')
        .select('plan, status')
        .eq('user_id', userId)
        .maybeSingle(),
      supabaseAdmin.from('user_roles').select('role').eq('user_id', userId),
    ]);

  if (rolesError) {
    console.warn('[gemini-voice-session] Failed reading roles for entitlement check:', rolesError);
  }
  if (entitlementsError) {
    console.warn(
      '[gemini-voice-session] Failed reading user_entitlements for entitlement check:',
      entitlementsError,
    );
  }

  const isEnterpriseAdmin = (roles ?? []).some(
    (row: any) => String(row?.role) === 'enterprise_admin',
  );
  if (isEnterpriseAdmin) {
    return true;
  }

  const plan = String(entitlements?.plan ?? '').toLowerCase();
  const status = String(entitlements?.status ?? '').toLowerCase();
  const isActiveSubscription = status === 'active' || status === 'trialing';

  return isActiveSubscription && plan.length > 0 && plan !== 'free';
}

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
      tools: [{ functionDeclarations: VOICE_FUNCTION_DECLARATIONS }, { googleSearch: {} }],
    },
  };

  const tokenResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenRequestBody),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(
      `Failed to create Gemini ephemeral token (${tokenResponse.status}): ${body.substring(0, 500)}`,
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
    const hasVoiceAccess = await canUseVoiceConcierge(supabaseAdmin, user.id);
    if (!hasVoiceAccess) {
      return new Response(
        JSON.stringify({ error: 'Voice concierge is not enabled for this account' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const body = await req.json();
    const requestedVoice = typeof body?.voice === 'string' ? body.voice : 'Puck';
    const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : 'Puck';
    const tripId = typeof body?.tripId === 'string' ? body.tripId : undefined;

    // Build full system instruction using shared context builder + prompt builder
    let systemInstruction: string;

    if (tripId) {
      try {
        const tripContext = await TripContextBuilder.buildContext(tripId, user.id, authHeader);
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

    const ephemeral = await createEphemeralToken({
      model: GEMINI_LIVE_MODEL,
      systemInstruction,
      voice,
    });

    // The ephemeral token already embeds model, voice, system instruction, and
    // tools. We intentionally omit systemInstruction from the response to avoid
    // leaking the full prompt to the client and to prevent the client from
    // sending a duplicate setup message that could strip tool declarations.
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
