import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { TripContextBuilder } from '../_shared/contextBuilder.ts';
import { buildSystemPrompt } from '../_shared/promptBuilder.ts';
import {
  createVertexAccessToken,
  parseServiceAccountKey,
  type ServiceAccountKey,
} from '../_shared/vertexAuth.ts';
import { VOICE_FUNCTION_DECLARATIONS, VOICE_ADDENDUM } from '../_shared/voiceToolDeclarations.ts';

// ── Vertex AI configuration (production-only provider) ──
const VERTEX_PROJECT_ID = Deno.env.get('VERTEX_PROJECT_ID');
const VERTEX_LOCATION = Deno.env.get('VERTEX_LOCATION') || 'us-central1';
const VERTEX_SERVICE_ACCOUNT_KEY = Deno.env.get('VERTEX_SERVICE_ACCOUNT_KEY');

// GA model for Vertex AI Live API — gemini-live-2.5-flash-native-audio
// The old preview model (gemini-live-2.5-flash-preview-native-audio-09-2025) is deprecated.
const VERTEX_LIVE_MODEL = Deno.env.get('VERTEX_LIVE_MODEL') || 'gemini-live-2.5-flash-native-audio';

// All features ON by default — supported on GA native-audio model
const VOICE_TOOLS_ENABLED =
  (Deno.env.get('VOICE_TOOLS_ENABLED') || 'true').toLowerCase() === 'true';

// Native-audio features — supported on gemini-live-2.5-flash-native-audio
const VOICE_AFFECTIVE_DIALOG =
  (Deno.env.get('VOICE_AFFECTIVE_DIALOG') || 'true').toLowerCase() === 'true';
const VOICE_PROACTIVE_AUDIO =
  (Deno.env.get('VOICE_PROACTIVE_AUDIO') || 'true').toLowerCase() === 'true';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const ALLOWED_VOICES = new Set(['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede']);
const DEFAULT_VOICE = 'Charon';

// ── Main handler ──

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const isVertexConfigured = !!(VERTEX_PROJECT_ID && VERTEX_SERVICE_ACCOUNT_KEY);

  // Health check
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        service: 'gemini-voice-session',
        provider: 'vertex',
        configured: isVertexConfigured,
        model: VERTEX_LIVE_MODEL,
        voice: DEFAULT_VOICE,
        location: VERTEX_LOCATION,
        toolsEnabled: VOICE_TOOLS_ENABLED,
        features: {
          affectiveDialog: VOICE_AFFECTIVE_DIALOG,
          proactiveAudio: VOICE_PROACTIVE_AUDIO,
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
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessionAttemptId =
      typeof bodyRaw?.sessionAttemptId === 'string' ? bodyRaw.sessionAttemptId : 'unknown';
    console.log(`${tag} handler_enter`, {
      sessionAttemptId,
      provider: 'vertex',
      model: VERTEX_LIVE_MODEL,
      toolsEnabled: VOICE_TOOLS_ENABLED,
      origin: req.headers.get('origin'),
      t0,
    });

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
      console.warn(`${tag} Auth failed`, { sessionAttemptId, error: authError?.message });
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`${tag} Authenticated`, {
      userId: user.id,
      sessionAttemptId,
      elapsedMs: Date.now() - t0,
    });

    const requestedVoice = typeof bodyRaw?.voice === 'string' ? bodyRaw.voice : DEFAULT_VOICE;
    const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : DEFAULT_VOICE;
    const tripId = typeof bodyRaw?.tripId === 'string' ? bodyRaw.tripId : undefined;
    const resumptionToken =
      typeof bodyRaw?.resumptionToken === 'string' ? bodyRaw.resumptionToken : undefined;

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

    // ── VERTEX AI (production-only path) ──
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

    // Use v1beta1 for Live API (matches proxy and gist)
    const websocketUrl = `wss://${VERTEX_LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;

    // Build setup message — camelCase matching confirmed-working gist
    // Phase A: Mode 0 boring handshake — no tools, no affective, no proactive
    const setupConfig: Record<string, unknown> = {
      model: `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_LIVE_MODEL}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice,
            },
          },
        },
      },
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      realtimeInputConfig: {
        activityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      contextWindowCompression: { slidingWindow: {} },
    };

    // Session resumption — only include when we have a token.
    // Sending an empty object can cause rejection on some Vertex AI versions.
    if (resumptionToken) {
      setupConfig.sessionResumption = { handle: resumptionToken };
      console.log(`${tag} Including session resumption token`);
    }

    // Mode 2+: tools (OFF by default in Phase A)
    if (VOICE_TOOLS_ENABLED) {
      setupConfig.tools = [{ functionDeclarations: VOICE_FUNCTION_DECLARATIONS }];
    }

    // Mode 4+: affective dialog (OFF by default in Phase A)
    if (VOICE_AFFECTIVE_DIALOG) {
      (setupConfig.generationConfig as Record<string, unknown>).enableAffectiveDialog = true;
    }
    // Mode 5+: proactive audio (OFF by default in Phase A)
    if (VOICE_PROACTIVE_AUDIO) {
      setupConfig.proactivity = { proactiveAudio: true };
    }

    const setupMessage = { setup: setupConfig };

    console.log(`${tag} Setup message built`, {
      hasTools: VOICE_TOOLS_ENABLED,
      toolCount: VOICE_TOOLS_ENABLED ? VOICE_FUNCTION_DECLARATIONS.length : 0,
      affectiveDialog: VOICE_AFFECTIVE_DIALOG,
      proactiveAudio: VOICE_PROACTIVE_AUDIO,
      totalMs: Date.now() - t0,
    });

    return new Response(
      JSON.stringify({
        accessToken,
        model: VERTEX_LIVE_MODEL,
        voice,
        provider: 'vertex',
        websocketUrl,
        setupMessage,
        toolsEnabled: VOICE_TOOLS_ENABLED,
        features: {
          affectiveDialog: VOICE_AFFECTIVE_DIALOG,
          proactiveAudio: VOICE_PROACTIVE_AUDIO,
        },
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
