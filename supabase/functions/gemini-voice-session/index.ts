import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

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

async function canUseVoiceConcierge(
  supabaseAdmin: any,
  userId: string,
): Promise<boolean> {
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

  const isEnterpriseAdmin = (roles ?? []).some((row: any) => String(row?.role) === 'enterprise_admin');
  if (isEnterpriseAdmin) {
    return true;
  }

  const plan = String(entitlements?.plan ?? '').toLowerCase();
  const status = String(entitlements?.status ?? '').toLowerCase();
  const isActiveSubscription = status === 'active' || status === 'trialing';

  // Voice is enabled for any active paid plan (explorer, frequent-chraveler, pro-*),
  // and denied for free/no-plan users.
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
    // Constrain the token to this model/voice/session setup so leaked tokens have
    // a narrow blast radius.
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

    // Build trip context for the voice session system instruction
    let systemInstruction = `You are Chravel Concierge, a helpful AI travel assistant. You are speaking with a user via voice. Keep responses conversational, concise, and natural for spoken delivery. Current date: ${new Date().toISOString().split('T')[0]}.`;

    if (tripId) {
      try {
        // Fetch basic trip context for the voice session
        const { data: trip } = await supabase
          .from('trips')
          .select('name, destination, start_date, end_date')
          .eq('id', tripId)
          .single();

        if (trip) {
          systemInstruction += `\n\nThe user is on a trip called "${trip.name}" to ${trip.destination || 'an unspecified destination'}.`;
          if (trip.start_date && trip.end_date) {
            systemInstruction += ` Travel dates: ${trip.start_date} to ${trip.end_date}.`;
          }
        }

        // Fetch upcoming events
        const { data: events } = await supabase
          .from('trip_events')
          .select('title, start_time, location')
          .eq('trip_id', tripId)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(5);

        if (events?.length) {
          systemInstruction += `\n\nUpcoming events:`;
          events.forEach((e: any) => {
            systemInstruction += `\n- ${e.title} at ${e.start_time}${e.location ? ` (${e.location})` : ''}`;
          });
        }
      } catch (contextError) {
        console.error('Failed to build voice context:', contextError);
        // Continue with basic system instruction
      }
    }

    systemInstruction += `\n\nVoice guidelines:
- Keep responses under 3 sentences unless the user asks for detail
- Use natural conversational language (no markdown, no links, no formatting)
- Be warm and helpful
- If you don't know something specific to the trip, say so and suggest checking the app`;

    const ephemeral = await createEphemeralToken({
      model: GEMINI_LIVE_MODEL,
      systemInstruction,
      voice,
    });

    // Return session config for client-side WebSocket connection.
    // We return an ephemeral token instead of exposing GEMINI_API_KEY.
    return new Response(
      JSON.stringify({
        accessToken: ephemeral.token,
        accessTokenExpiresAt: ephemeral.expireTime ?? null,
        newSessionExpiresAt: ephemeral.newSessionExpireTime ?? null,
        model: GEMINI_LIVE_MODEL,
        systemInstruction,
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
