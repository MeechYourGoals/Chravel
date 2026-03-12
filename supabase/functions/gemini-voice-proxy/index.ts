/**
 * gemini-voice-proxy — WebSocket relay between browser and Vertex AI Live API.
 *
 * Architecture (from the gist / official Vertex docs):
 *   Browser → WSS to this proxy → proxy opens upstream WSS to Vertex AI
 *   Proxy handles GCP OAuth2 auth server-side (no credentials touch browser).
 *   All messages relayed bidirectionally.
 *
 * The client sends a JSON "init" message first containing { tripId, voice, ... }.
 * The proxy:
 *   1. Authenticates the user via Supabase JWT
 *   2. Builds the BidiGenerateContentSetup message with system prompt + tools
 *   3. Mints an OAuth2 access token from the GCP service account
 *   4. Opens upstream WSS to Vertex AI with Authorization: Bearer header
 *   5. Sends the setup message upstream
 *   6. Relays all subsequent messages bidirectionally
 *
 * Key patterns from the gist:
 *   - Buffer client messages during GCP auth (upstream not ready yet)
 *   - 30-second keepalive pings upstream
 *   - Safe close code filtering (1005/1006 → 1000)
 *   - SILENT scheduling on tool responses to prevent double-speech
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { TripContextBuilder } from '../_shared/contextBuilder.ts';
import { buildSystemPrompt } from '../_shared/promptBuilder.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { VOICE_FUNCTION_DECLARATIONS, VOICE_ADDENDUM } from '../_shared/voiceToolDeclarations.ts';

// ── Environment ──
const VERTEX_PROJECT_ID = Deno.env.get('VERTEX_PROJECT_ID');
const VERTEX_LOCATION = Deno.env.get('VERTEX_LOCATION') || 'us-central1';
const VERTEX_SERVICE_ACCOUNT_KEY = Deno.env.get('VERTEX_SERVICE_ACCOUNT_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const VERTEX_LIVE_MODEL = Deno.env.get('VERTEX_LIVE_MODEL') || 'gemini-live-2.5-flash-native-audio';

// All features ON by default — supported on GA native-audio model
const VOICE_TOOLS_ENABLED =
  (Deno.env.get('VOICE_TOOLS_ENABLED') || 'true').toLowerCase() === 'true';
const VOICE_AFFECTIVE_DIALOG =
  (Deno.env.get('VOICE_AFFECTIVE_DIALOG') || 'true').toLowerCase() === 'true';
const VOICE_PROACTIVE_AUDIO =
  (Deno.env.get('VOICE_PROACTIVE_AUDIO') || 'true').toLowerCase() === 'true';

const ALLOWED_VOICES = new Set(['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede']);
const DEFAULT_VOICE = 'Charon';

// Keepalive interval for upstream Vertex WebSocket (30s per gist recommendation)
const UPSTREAM_KEEPALIVE_MS = 30_000;

// ── OAuth2 token minting — import from shared module ──
import { createVertexAccessToken, parseServiceAccountKey } from '../_shared/vertexAuth.ts';

/** Filter close codes that are invalid for ws.close() */
function safeCloseCode(code: number): number {
  // 1005 (No Status Received) and 1006 (Abnormal Closure) are not valid for ws.close()
  if (code === 1005 || code === 1006) return 1000;
  return code;
}

// ── Main handler ──

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check
  if (req.method === 'GET') {
    const isConfigured = !!(VERTEX_PROJECT_ID && VERTEX_SERVICE_ACCOUNT_KEY);
    return new Response(
      JSON.stringify({
        service: 'gemini-voice-proxy',
        provider: 'vertex',
        configured: isConfigured,
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

  // WebSocket upgrade
  const upgrade = req.headers.get('upgrade') || '';
  if (upgrade.toLowerCase() !== 'websocket') {
    return new Response(
      JSON.stringify({ error: 'This endpoint requires a WebSocket connection.' }),
      { status: 426, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { socket: clientWs, response } = Deno.upgradeWebSocket(req);

  const tag = `[voice-proxy:${crypto.randomUUID().slice(0, 8)}]`;
  let upstreamWs: WebSocket | null = null;
  let upstreamReady = false;
  const clientBuffer: string[] = []; // Buffer client messages until upstream is ready
  let keepaliveInterval: ReturnType<typeof setInterval> | null = null;
  let initReceived = false;

  function log(event: string, data?: Record<string, unknown>) {
    console.log(`${tag} ${event}`, data ?? '');
  }

  function closeAll(code = 1000, reason = '') {
    if (keepaliveInterval) {
      clearInterval(keepaliveInterval);
      keepaliveInterval = null;
    }
    try {
      if (upstreamWs && upstreamWs.readyState <= WebSocket.OPEN) {
        upstreamWs.close(safeCloseCode(code), reason.slice(0, 123));
      }
    } catch {
      /* ignore */
    }
    try {
      if (clientWs.readyState <= WebSocket.OPEN) {
        clientWs.close(safeCloseCode(code), reason.slice(0, 123));
      }
    } catch {
      /* ignore */
    }
  }

  clientWs.onopen = () => {
    log('client_connected');
  };

  clientWs.onmessage = async (event: MessageEvent) => {
    try {
      const raw = typeof event.data === 'string' ? event.data : '';

      // First message from client is the init message with auth + config
      if (!initReceived) {
        initReceived = true;
        let initData: Record<string, unknown>;
        try {
          initData = JSON.parse(raw);
        } catch {
          clientWs.close(4400, 'Invalid init message');
          return;
        }

        log('init_received', {
          hasTripId: !!initData.tripId,
          hasAuthToken: !!initData.authToken,
          voice: initData.voice as string,
        });

        const authToken = typeof initData.authToken === 'string' ? initData.authToken : '';
        if (!authToken) {
          clientWs.send(
            JSON.stringify({ error: { code: 401, message: 'Authentication required' } }),
          );
          clientWs.close(4401, 'No auth token');
          return;
        }

        // Authenticate user
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${authToken}` } },
        });
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(authToken);
        if (authError || !user) {
          log('auth_failed', { error: authError?.message });
          clientWs.send(
            JSON.stringify({ error: { code: 401, message: 'Invalid authentication' } }),
          );
          clientWs.close(4401, 'Auth failed');
          return;
        }
        log('authenticated', { userId: user.id });

        // Validate config
        if (!VERTEX_PROJECT_ID || !VERTEX_SERVICE_ACCOUNT_KEY) {
          clientWs.send(
            JSON.stringify({ error: { code: 500, message: 'Vertex AI not configured' } }),
          );
          clientWs.close(4500, 'Not configured');
          return;
        }

        const requestedVoice = typeof initData.voice === 'string' ? initData.voice : DEFAULT_VOICE;
        const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : DEFAULT_VOICE;
        const tripId = typeof initData.tripId === 'string' ? initData.tripId : undefined;
        const resumptionToken =
          typeof initData.resumptionToken === 'string' ? initData.resumptionToken : undefined;

        // Build system instruction
        let systemInstruction: string;
        if (tripId) {
          try {
            const contextTimeout = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('context_build_timeout')), 15_000),
            );
            const tripContext = await Promise.race([
              TripContextBuilder.buildContextWithCache(
                tripId,
                user.id,
                `Bearer ${authToken}`,
                true,
              ),
              contextTimeout,
            ]);
            systemInstruction = buildSystemPrompt(tripContext);
            log('context_built');
          } catch (contextError) {
            const errMsg =
              contextError instanceof Error ? contextError.message : String(contextError);
            log('context_failed', { error: errMsg });
            systemInstruction = `You are Chravel Concierge, a helpful AI travel assistant. Current date: ${new Date().toISOString().split('T')[0]}.`;
          }
        } else {
          systemInstruction = `You are Chravel Concierge, a helpful AI travel assistant. Current date: ${new Date().toISOString().split('T')[0]}.`;
        }
        systemInstruction += VOICE_ADDENDUM;

        // Mint OAuth2 token
        log('minting_token');
        const saKey = parseServiceAccountKey(VERTEX_SERVICE_ACCOUNT_KEY);
        const accessToken = await createVertexAccessToken(saKey);
        log('token_minted');

        // Build setup message — camelCase matching confirmed-working gist
        // Phase A: Mode 0 boring handshake — no tools, no affective, no proactive
        const setupConfig: Record<string, unknown> = {
          model: `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_LIVE_MODEL}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
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
          sessionResumption: resumptionToken ? { handle: resumptionToken } : {},
        };

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

        const setupMessage = JSON.stringify({ setup: setupConfig });

        // Open upstream WebSocket to Vertex AI with Bearer token in header
        // Gist says: use v1beta1 for the endpoint
        const upstreamUrl = `wss://${VERTEX_LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;

        log('upstream_connecting', { host: `${VERTEX_LOCATION}-aiplatform.googleapis.com` });

        // Deno's WebSocket constructor supports headers via the second arg (protocols)
        // but for Bearer auth, we need to pass it differently.
        // For Vertex AI, the access token goes as a query parameter on the upstream WS.
        // The gist says "Authorization: Bearer" header, but Deno WebSocket doesn't support
        // custom headers. Use URL param as fallback (same as SDK behavior).
        const upstreamUrlWithAuth = `${upstreamUrl}?access_token=${encodeURIComponent(accessToken)}`;
        upstreamWs = new WebSocket(upstreamUrlWithAuth);

        let setupCompleteReceived = false;
        let firstUpstreamMessageLogged = false;

        upstreamWs.onopen = () => {
          log('upstream_opened');
          // Send setup message as first message
          upstreamWs!.send(setupMessage);
          log('setup_sent', {
            modelPath: setupConfig.model,
            voice,
            toolsEnabled: VOICE_TOOLS_ENABLED,
            affective: VOICE_AFFECTIVE_DIALOG,
            proactive: VOICE_PROACTIVE_AUDIO,
          });
          upstreamReady = true;

          // Flush any buffered client messages
          while (clientBuffer.length > 0) {
            const msg = clientBuffer.shift()!;
            upstreamWs!.send(msg);
          }

          // Start keepalive pings (30s per gist) — camelCase
          keepaliveInterval = setInterval(() => {
            if (upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
              upstreamWs.send(
                JSON.stringify({
                  realtimeInput: {
                    mediaChunks: [
                      {
                        mimeType: 'audio/pcm;rate=16000',
                        data: '',
                      },
                    ],
                  },
                }),
              );
            }
          }, UPSTREAM_KEEPALIVE_MS);
        };

        upstreamWs.onmessage = (upstreamEvent: MessageEvent) => {
          // Protocol observability: log first upstream message verbatim
          if (!firstUpstreamMessageLogged) {
            firstUpstreamMessageLogged = true;
            const data = typeof upstreamEvent.data === 'string' ? upstreamEvent.data : '';
            try {
              const parsed = JSON.parse(data);
              const hasSetupComplete = !!(parsed.setupComplete || parsed.setup_complete);
              if (hasSetupComplete) {
                setupCompleteReceived = true;
                log('setup_complete_received');
              }
              // Log structure keys (not full payload to avoid PII leaks)
              log('first_upstream_message', { keys: Object.keys(parsed), hasSetupComplete });
            } catch {
              log('first_upstream_message', { raw_length: data.length, parse_failed: true });
            }
          } else {
            // Check subsequent messages for setupComplete too
            const data = typeof upstreamEvent.data === 'string' ? upstreamEvent.data : '';
            try {
              const parsed = JSON.parse(data);
              if (!setupCompleteReceived && (parsed.setupComplete || parsed.setup_complete)) {
                setupCompleteReceived = true;
                log('setup_complete_received');
              }
            } catch {
              /* binary frame, ignore */
            }
          }

          // Relay upstream messages to client
          if (clientWs.readyState === WebSocket.OPEN) {
            const data = typeof upstreamEvent.data === 'string' ? upstreamEvent.data : '';
            clientWs.send(data);
          }
        };

        upstreamWs.onerror = (ev: Event) => {
          log('upstream_error', { type: (ev as ErrorEvent).message ?? 'unknown' });
        };

        upstreamWs.onclose = (ev: CloseEvent) => {
          log('upstream_closed', {
            code: ev.code,
            reason: ev.reason,
            wasClean: ev.wasClean,
            setupCompleteReceived,
          });
          upstreamReady = false;
          closeAll(safeCloseCode(ev.code), ev.reason || 'Upstream closed');
        };

        return;
      }

      // Subsequent messages: relay to upstream (or buffer if not ready)
      if (upstreamReady && upstreamWs && upstreamWs.readyState === WebSocket.OPEN) {
        upstreamWs.send(raw);
      } else {
        clientBuffer.push(raw);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Proxy error';
      log('handler_error', { error: errMsg });
      clientWs.send(JSON.stringify({ error: { code: 500, message: errMsg } }));
      closeAll(4500, errMsg);
    }
  };

  clientWs.onerror = (ev: Event) => {
    log('client_error', { type: (ev as ErrorEvent).message ?? 'unknown' });
  };

  clientWs.onclose = (ev: CloseEvent) => {
    log('client_closed', { code: ev.code, reason: ev.reason });
    closeAll(safeCloseCode(ev.code), ev.reason || 'Client closed');
  };

  return response;
});
