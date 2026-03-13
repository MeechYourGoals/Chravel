import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AudioPlaybackQueue } from '@/lib/geminiLive/audioPlayback';
import { startAudioCapture, type AudioCaptureHandle } from '@/lib/geminiLive/audioCapture';
import { VOICE_LIVE_ENABLED, VOICE_DIAGNOSTICS_ENABLED } from '@/config/voiceFeatureFlags';
import {
  recordFailure,
  recordSuccess as recordCircuitBreakerSuccess,
  isOpen as isCircuitBreakerOpen,
  reset as resetCircuitBreaker,
} from '@/voice/circuitBreaker';
import {
  logAudioContextParams,
  checkCaptureSampleRate,
  AUDIO_CONTRACT,
} from '@/voice/audioContract';

export type GeminiLiveState =
  | 'idle'
  | 'requesting_mic'
  | 'ready'
  | 'listening'
  | 'sending'
  | 'playing'
  | 'interrupted'
  | 'error';

export interface VoiceDiagnostics {
  enabled: boolean;
  connectionStatus: 'idle' | 'connecting' | 'open' | 'closed' | 'error';
  audioContextState: AudioContextState | 'unavailable';
  audioSampleRate: number | null;
  inputEncoding: string;
  micPermission: PermissionState | 'unsupported' | 'unknown';
  micDeviceLabel: string | null;
  micRms: number;
  /** RMS of current playback audio (for overlay visualization) */
  playbackRms: number;
  wsCloseCode: number | null;
  wsCloseReason: string | null;
  reconnectAttempts: number;
  lastError: string | null;
  /** Substep label for incremental UI feedback */
  substep: string | null;
  metrics: {
    firstAudioChunkSentMs: number | null;
    firstTokenReceivedMs: number | null;
    firstAudioFramePlayedMs: number | null;
    cancelLatencyMs: number | null;
  };
}

export interface ToolCallRequest {
  name: string;
  args: Record<string, unknown>;
  id: string;
}

export interface ToolCallResult {
  name: string;
  result: Record<string, unknown>;
}

interface UseGeminiLiveOptions {
  tripId: string;
  voice?: string;
  onToolCall?: (call: ToolCallRequest) => Promise<Record<string, unknown>>;
  onTurnComplete?: (
    userText: string,
    assistantText: string,
    toolResults?: ToolCallResult[],
  ) => void;
  onError?: (message: string) => void;
  /** Called when circuit breaker opens (voice disabled for session) */
  onCircuitBreakerOpen?: () => void;
}

export interface VoiceConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}

interface UseGeminiLiveReturn {
  state: GeminiLiveState;
  error: string | null;
  userTranscript: string;
  assistantTranscript: string;
  conversationHistory: VoiceConversationTurn[];
  diagnostics: VoiceDiagnostics;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  interruptPlayback: () => void;
  sendImage: (mimeType: string, base64Data: string) => void;
  isSupported: boolean;
  circuitBreakerOpen: boolean;
  resetCircuitBreaker: () => void;
}

const LIVE_INPUT_MIME = 'audio/pcm;rate=16000';
const WEBSOCKET_SETUP_TIMEOUT_MS = 20_000; // Allow time for proxy → Vertex handshake
const THINKING_DELAY_MS = 1_500;
const BARGE_IN_RMS_THRESHOLD = 0.035;
const WS_KEEPALIVE_INTERVAL_MS = 15_000;
const AUTO_RECONNECT_DELAY_MS = 2_000;
const MAX_AUTO_RECONNECT_RETRIES = 2; // Cap retries

/** Structured debug logging — enabled in dev mode or when VITE_VOICE_DEBUG=true */
const VOICE_DEBUG =
  typeof import.meta !== 'undefined' &&
  (import.meta.env?.DEV || import.meta.env?.VITE_VOICE_DEBUG === 'true');

function voiceLog(event: string, data?: Record<string, unknown>): void {
  if (!VOICE_DEBUG) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[GeminiLive ${ts}] ${event}`, data ?? '');
}

// Safari < 14.5 exposes webkitAudioContext instead of AudioContext
const SafeAudioContext: typeof AudioContext | undefined =
  typeof window !== 'undefined'
    ? (window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    : undefined;

// Precomputed silent PCM16 frame for keepalive (320 samples = 20ms @ 16kHz).
// Gemini may not recognize an empty mediaChunks array as valid data, so we send
// real silence to keep the WebSocket alive and avoid server-side idle timeout.
const SILENT_KEEPALIVE_FRAME = (() => {
  const samples = 320;
  const pcm16 = new Int16Array(samples); // All zeros = silence
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
})();

let idCounter = 0;
function uniqueId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function mapSessionError(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes('unregistered callers') ||
    lower.includes('callers without established identity')
  ) {
    return 'Voice failed: API key missing or restricted. Ensure GEMINI_API_KEY is set in Supabase Edge Function secrets.';
  }
  if (raw.includes('403') || lower.includes('not enabled')) {
    return 'Voice is unavailable right now (API configuration issue). Please try again later.';
  }
  if (
    lower.includes('gemini_api_key') ||
    lower.includes('api key') ||
    lower.includes('not configured')
  ) {
    return 'Voice AI is not configured. Please contact support.';
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('authentication')) {
    return 'Voice session authentication failed. Please refresh the page and try again.';
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('quota')) {
    return 'Voice service is busy right now. Please wait a moment and try again.';
  }
  if (lower.includes('503') || lower.includes('service unavailable')) {
    return 'Voice service is temporarily unavailable. Please try again shortly.';
  }
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return 'Voice service is responding slowly. Check your connection and try again.';
  }
  return raw;
}

function mapWsCloseError(code: number, reason: string): string | null {
  if (code === 1000 || code === 1005) return null;
  if (reason) return `Voice disconnected: ${reason} (code ${code})`;
  const MESSAGES: Record<number, string> = {
    1001: 'Voice session ended (browser navigated away).',
    1002: 'Voice connection protocol error — please try again.',
    1006: 'Voice connection dropped — check your internet and try again.',
    1011: 'Voice server error — please try again.',
    4000: 'Voice session expired — please start a new session.',
    4001: 'Voice session not authorized — please refresh and try again.',
    4429: 'Voice rate limit reached — please wait a moment and try again.',
  };
  return MESSAGES[code] ?? `Voice disconnected unexpectedly (code ${code}).`;
}

const initialDiagnostics: VoiceDiagnostics = {
  enabled: (import.meta.env.VITE_VOICE_DEBUG || '').toLowerCase() === 'true' || import.meta.env.DEV,
  connectionStatus: 'idle',
  audioContextState: 'unavailable',
  audioSampleRate: null,
  inputEncoding: LIVE_INPUT_MIME,
  micPermission: 'unknown',
  micDeviceLabel: null,
  micRms: 0,
  playbackRms: 0,
  wsCloseCode: null,
  wsCloseReason: null,
  reconnectAttempts: 0,
  lastError: null,
  substep: null,
  metrics: {
    firstAudioChunkSentMs: null,
    firstTokenReceivedMs: null,
    firstAudioFramePlayedMs: null,
    cancelLatencyMs: null,
  },
};

export function useGeminiLive({
  tripId,
  voice = 'Charon',
  onToolCall,
  onTurnComplete,
  onError,
  onCircuitBreakerOpen,
}: UseGeminiLiveOptions): UseGeminiLiveReturn {
  const [state, setState] = useState<GeminiLiveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<VoiceConversationTurn[]>([]);
  const [diagnostics, setDiagnostics] = useState<VoiceDiagnostics>(initialDiagnostics);
  const stateRef = useRef<GeminiLiveState>('idle');
  const diagnosticsRef = useRef<VoiceDiagnostics>(initialDiagnostics);
  const [circuitBreakerOpen, setCircuitBreakerOpen] = useState(false);

  const onTurnCompleteRef = useRef(onTurnComplete);
  useEffect(() => {
    onTurnCompleteRef.current = onTurnComplete;
  }, [onTurnComplete]);

  const onToolCallRef = useRef(onToolCall);
  useEffect(() => {
    onToolCallRef.current = onToolCall;
  }, [onToolCall]);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    diagnosticsRef.current = diagnostics;
  }, [diagnostics]);

  const onCircuitBreakerOpenRef = useRef(onCircuitBreakerOpen);
  useEffect(() => {
    onCircuitBreakerOpenRef.current = onCircuitBreakerOpen;
  }, [onCircuitBreakerOpen]);

  // Sync circuit breaker state on mount
  useEffect(() => {
    setCircuitBreakerOpen(isCircuitBreakerOpen());
  }, []);

  // ── Internal refs ──
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureHandleRef = useRef<AudioCaptureHandle | null>(null);
  const playbackQueueRef = useRef<AudioPlaybackQueue | null>(null);
  const isStartingRef = useRef(false);
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnStartedAtRef = useRef<number | null>(null);
  const cancelStartedAtRef = useRef<number | null>(null);
  const sessionExpiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepaliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Auto-reconnect: disabled until first successful session (Gate fix)
  const autoReconnectAllowedRef = useRef(false);
  const autoReconnectCountRef = useRef(0);
  const autoReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against re-entrant cleanup calls
  const isCleaningUpRef = useRef(false);
  // Track whether we've ever had a successful session (for enabling auto-reconnect)
  const hasHadSuccessfulSessionRef = useRef(false);
  // Session resumption token — stored when goAway or sessionResumptionUpdate arrives.
  // Sent on reconnect to resume the conversation without losing context.
  const resumptionTokenRef = useRef<string | null>(null);

  const userTranscriptAccRef = useRef('');
  const assistantTranscriptAccRef = useRef('');
  /** Accumulated tool call results for the current turn */
  const turnToolResultsRef = useRef<ToolCallResult[]>([]);
  const modelRespondingRef = useRef(false);
  const turnCompleteReceivedRef = useRef(false);
  const drainTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userHasSpokenRef = useRef(false);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof WebSocket !== 'undefined' &&
    SafeAudioContext !== undefined &&
    typeof navigator?.mediaDevices?.getUserMedia === 'function';

  const patchDiagnostics = useCallback((patch: Partial<VoiceDiagnostics>) => {
    setDiagnostics(prev => {
      const next = { ...prev, ...patch };
      diagnosticsRef.current = next;
      return next;
    });
  }, []);

  const patchMetrics = useCallback((patch: Partial<VoiceDiagnostics['metrics']>) => {
    setDiagnostics(prev => {
      const next = { ...prev, metrics: { ...prev.metrics, ...patch } };
      diagnosticsRef.current = next;
      return next;
    });
  }, []);

  const debugLog = useCallback((event: string, payload: Record<string, unknown> = {}) => {
    if (!diagnosticsRef.current.enabled) return;
    console.debug('[GeminiLive]', event, payload);
  }, []);

  const transition = useCallback(
    (next: GeminiLiveState, reason: string) => {
      setState(prev => {
        if (prev !== next) {
          debugLog('state_transition', { from: prev, to: next, reason });
        }
        stateRef.current = next;
        return next;
      });
    },
    [debugLog],
  );

  const recordVoiceFailure = useCallback((errMsg: string) => {
    const justOpened = recordFailure(errMsg);
    if (justOpened) {
      setCircuitBreakerOpen(true);
      onCircuitBreakerOpenRef.current?.();
    }
  }, []);

  const clearThinkingTimer = useCallback(() => {
    if (thinkingTimerRef.current) {
      clearTimeout(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
  }, []);

  const resetMetricsForNewTurn = useCallback(() => {
    turnStartedAtRef.current = performance.now();
    patchMetrics({
      firstAudioChunkSentMs: null,
      firstTokenReceivedMs: null,
      firstAudioFramePlayedMs: null,
      cancelLatencyMs: null,
    });
  }, [patchMetrics]);

  const cleanup = useCallback(async () => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    isStartingRef.current = false;
    turnCompleteReceivedRef.current = false;
    clearThinkingTimer();
    if (drainTimeoutRef.current) {
      clearTimeout(drainTimeoutRef.current);
      drainTimeoutRef.current = null;
    }
    if (sessionExpiryTimerRef.current) {
      clearTimeout(sessionExpiryTimerRef.current);
      sessionExpiryTimerRef.current = null;
    }
    if (keepaliveIntervalRef.current) {
      clearInterval(keepaliveIntervalRef.current);
      keepaliveIntervalRef.current = null;
    }
    if (autoReconnectTimerRef.current) {
      clearTimeout(autoReconnectTimerRef.current);
      autoReconnectTimerRef.current = null;
    }

    captureHandleRef.current?.stop();
    captureHandleRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    playbackQueueRef.current?.destroy();
    playbackQueueRef.current = null;

    const ctxToClose = audioCtxRef.current;
    audioCtxRef.current = null;
    if (ctxToClose && ctxToClose.state !== 'closed') {
      try {
        await ctxToClose.close();
      } catch {
        // Non-fatal
      }
    }

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    patchDiagnostics({
      connectionStatus: 'closed',
      audioContextState: 'unavailable',
      audioSampleRate: null,
      micRms: 0,
      playbackRms: 0,
      substep: null,
    });

    isCleaningUpRef.current = false;
  }, [clearThinkingTimer, patchDiagnostics]);

  useEffect(
    () => () => {
      void cleanup();
    },
    [cleanup],
  );

  /** Emit a completed turn to the callback and append to conversation history. */
  const emitTurnComplete = useCallback((userText: string, assistantText: string) => {
    if (!userText && !assistantText) return;
    const toolResults =
      turnToolResultsRef.current.length > 0 ? [...turnToolResultsRef.current] : undefined;
    turnToolResultsRef.current = [];
    onTurnCompleteRef.current?.(userText, assistantText, toolResults);
    setConversationHistory(prev => {
      const next = [...prev];
      if (userText) next.push({ role: 'user', text: userText });
      if (assistantText) next.push({ role: 'assistant', text: assistantText });
      return next;
    });
  }, []);

  const prevTripIdRef = useRef(tripId);
  useEffect(() => {
    if (prevTripIdRef.current !== tripId && wsRef.current) {
      const pendingUser = userTranscriptAccRef.current.trim();
      const pendingAssistant = assistantTranscriptAccRef.current.trim();
      emitTurnComplete(pendingUser, pendingAssistant);
      void cleanup();
      transition('idle', 'trip_changed');
      setError(null);
      setUserTranscript('');
      setAssistantTranscript('');
      userTranscriptAccRef.current = '';
      assistantTranscriptAccRef.current = '';
    }
    prevTripIdRef.current = tripId;
  }, [tripId, cleanup, emitTurnComplete, transition]);

  const flushModelOutput = useCallback(() => {
    playbackQueueRef.current?.flush();
    clearThinkingTimer();
  }, [clearThinkingTimer]);

  const sendCancelSignal = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    cancelStartedAtRef.current = performance.now();
    ws.send(JSON.stringify({ clientContent: { turnComplete: true } }));
    debugLog('cancel_sent', {});
  }, [debugLog]);

  const resetTurnAccumulators = useCallback(() => {
    userTranscriptAccRef.current = '';
    assistantTranscriptAccRef.current = '';
    turnToolResultsRef.current = [];
    modelRespondingRef.current = false;
    turnCompleteReceivedRef.current = false;
    if (drainTimeoutRef.current) {
      clearTimeout(drainTimeoutRef.current);
      drainTimeoutRef.current = null;
    }
    userHasSpokenRef.current = false;
    setUserTranscript('');
    setAssistantTranscript('');
  }, []);

  const handleToolCallWs = useCallback(
    async (ws: WebSocket, toolCallData: Record<string, unknown>) => {
      const functionCalls = (toolCallData.functionCalls || []) as Array<{
        id: string;
        name: string;
        args?: Record<string, unknown>;
      }>;

      const handler = onToolCallRef.current;
      if (!handler) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              toolResponse: {
                functionResponses: functionCalls.map(fc => ({
                  id: fc.id,
                  name: fc.name,
                  response: { result: 'Tool execution not available' },
                })),
              },
            }),
          );
        }
        return;
      }

      const responses = await Promise.all(
        functionCalls.map(async fc => {
          try {
            const result = await handler({ id: fc.id, name: fc.name, args: fc.args || {} });
            // Accumulate tool results for rich card rendering in chat
            turnToolResultsRef.current.push({ name: fc.name, result });
            return { id: fc.id, name: fc.name, response: result };
          } catch (err) {
            return {
              id: fc.id,
              name: fc.name,
              response: { error: err instanceof Error ? err.message : 'Tool execution failed' },
            };
          }
        }),
      );

      if (ws.readyState === WebSocket.OPEN) {
        // Use SILENT scheduling to prevent the model from narrating tool results
        // (double-speech). Vertex AI supports FunctionResponseScheduling.SILENT.
        // See gist: "Send tool responses with SILENT scheduling"
        const silentResponses = responses.map(r => ({
          ...r,
          scheduling: 'SILENT',
        }));
        ws.send(JSON.stringify({ toolResponse: { functionResponses: silentResponses } }));
      }
    },
    [],
  );

  const sendImage = useCallback((mimeType: string, base64Data: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType, data: base64Data }] } }),
    );
  }, []);

  // Ref always pointing to latest startSession (for safe self-referential auto-reconnect).
  const startSessionRef = useRef<() => Promise<void>>(async () => {});

  const startSession = useCallback(async () => {
    // ── Gate 0: sessionAttemptId for end-to-end correlation ──
    const sessionAttemptId = crypto.randomUUID();
    const t0 = performance.now();
    console.warn('[VOICE:G0] tap_live', { sessionAttemptId, tripId, voice });

    if (!VOICE_LIVE_ENABLED) {
      setError('Voice is currently disabled.');
      transition('error', 'voice_disabled');
      return;
    }

    if (isCircuitBreakerOpen()) {
      setCircuitBreakerOpen(true);
      setError('Voice is temporarily unavailable. Tap "Try voice again" to retry.');
      setState('error');
      toast.warning(
        'Voice temporarily unavailable after repeated failures. Tap "Try voice again" to retry.',
      );
      return;
    }

    if (!isSupported) {
      const msg = 'Voice is not supported in this browser. Try Chrome, Edge, or Safari.';
      setError(msg);
      transition('error', 'unsupported_browser');
      return;
    }

    if (isStartingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    isStartingRef.current = true;

    try {
      transition('requesting_mic', 'start_clicked');
      patchDiagnostics({
        connectionStatus: 'connecting',
        wsCloseCode: null,
        wsCloseReason: null,
        lastError: null,
        substep: 'Getting voice session…',
      });
      setError(null);
      resetTurnAccumulators();
      setConversationHistory([]);
      resetMetricsForNewTurn();
      const sessionId = uniqueId('vs');
      const sessionStartedAt = performance.now();
      voiceLog('session:start', { sessionId, tripId, voice, sessionAttemptId });

      if (!SafeAudioContext) {
        throw new Error('Audio is not supported in this browser.');
      }
      try {
        audioCtxRef.current = new SafeAudioContext();
        voiceLog('audioContext:created', {
          sampleRate: audioCtxRef.current.sampleRate,
          state: audioCtxRef.current.state,
        });
      } catch {
        throw new Error('Failed to initialize audio system.');
      }

      logAudioContextParams(audioCtxRef.current, VOICE_DIAGNOSTICS_ENABLED);
      const { needsResample } = checkCaptureSampleRate(
        audioCtxRef.current.sampleRate,
        VOICE_DIAGNOSTICS_ENABLED,
      );
      if (needsResample && VOICE_DIAGNOSTICS_ENABLED) {
        console.log(
          '[useGeminiLive] Capture will resample to',
          AUDIO_CONTRACT.expectedSampleRateHz,
          'Hz',
        );
      }

      // Kick off resume synchronously
      void audioCtxRef.current.resume().catch(() => {});

      patchDiagnostics({
        audioContextState: audioCtxRef.current.state,
        audioSampleRate: audioCtxRef.current.sampleRate,
      });

      // ── Gate 3: Log audio context state ──
      console.warn('[VOICE:G3] audio_context_state', {
        sessionAttemptId,
        state: audioCtxRef.current.state,
        sampleRate: audioCtxRef.current.sampleRate,
      });

      if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
        try {
          const status = await navigator.permissions.query({
            name: 'microphone' as PermissionName,
          });
          patchDiagnostics({ micPermission: status.state });
        } catch {
          patchDiagnostics({ micPermission: 'unsupported' });
        }
      }

      // ── Get voice session + mic IN PARALLEL ──
      console.warn('[VOICE:G0] parallel_start', {
        sessionAttemptId,
        msFromStart: Math.round(performance.now() - t0),
      });

      patchDiagnostics({ substep: 'Setting up voice & microphone…' });

      // Get voice session from gemini-voice-session edge function (HTTP POST).
      // Returns { accessToken, websocketUrl, setupMessage } for direct Vertex AI connection.
      const sessionPromise = supabase.functions
        .invoke('gemini-voice-session', {
          body: {
            tripId,
            voice,
            sessionAttemptId,
            ...(resumptionTokenRef.current ? { resumptionToken: resumptionTokenRef.current } : {}),
          },
        })
        .then(({ data, error: fnError }) => {
          if (fnError) {
            throw new Error(mapSessionError(fnError.message || 'Voice session request failed'));
          }
          if (!data?.accessToken || !data?.websocketUrl || !data?.setupMessage) {
            throw new Error('Voice session returned incomplete data. Please try again.');
          }
          patchDiagnostics({ substep: 'Session ready, waiting for microphone…' });
          return data as {
            accessToken: string;
            websocketUrl: string;
            setupMessage: Record<string, unknown>;
          };
        });

      const micPromise = navigator.mediaDevices
        .getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        .then(stream => {
          patchDiagnostics({ substep: 'Microphone ready, connecting…' });
          return stream;
        })
        .catch((mediaErr: Error) => {
          const name = mediaErr.name || '';
          let errMsg: string;
          if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
            errMsg =
              'Microphone permission denied. Allow microphone access in your browser settings and try again.';
          } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
            errMsg = 'No microphone detected. Connect a microphone and try again.';
          } else if (name === 'NotReadableError' || name === 'TrackStartError') {
            errMsg = 'Microphone is already in use by another app. Close other apps and try again.';
          } else {
            errMsg = 'Could not access microphone. Check your audio settings and try again.';
          }
          throw new Error(errMsg);
        });

      // Await both in parallel
      let sessionData: {
        accessToken: string;
        websocketUrl: string;
        setupMessage: Record<string, unknown>;
      };
      let stream: MediaStream;
      try {
        [sessionData, stream] = await Promise.all([sessionPromise, micPromise]);
      } catch (err) {
        // Clean up mic if session failed, or vice versa
        micPromise.then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
        const errMsg = err instanceof Error ? err.message : 'Failed to initialize voice session';
        console.warn('[VOICE:G0] parallel_failed', { sessionAttemptId, error: errMsg });
        recordVoiceFailure(errMsg);
        throw new Error(errMsg);
      }

      console.warn('[VOICE:G0] parallel_done', { sessionAttemptId });
      voiceLog('timing:sessionAndMic', { ms: Math.round(performance.now() - sessionStartedAt) });
      mediaStreamRef.current = stream;

      const track = stream.getAudioTracks()[0];
      console.warn('[VOICE:G3] mic_acquired', {
        sessionAttemptId,
        deviceLabel: track?.label || 'unknown',
      });
      voiceLog('mic:acquired', {
        tracks: stream.getAudioTracks().map(t => ({
          label: t.label,
          settings: t.getSettings(),
        })),
      });
      voiceLog('timing:mic', { ms: Math.round(performance.now() - sessionStartedAt) });
      patchDiagnostics({ micDeviceLabel: track?.label || null });

      // Resume AudioContext again after async gap (iOS Safari)
      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume().catch(() => {});
      }
      if (audioCtxRef.current?.state === 'suspended') {
        await new Promise(r => setTimeout(r, 100));
        await audioCtxRef.current.resume().catch(() => {});
      }

      if (!audioCtxRef.current) throw new Error('Audio context lost.');
      voiceLog('audioContext:resumed', {
        state: audioCtxRef.current.state,
        sampleRate: audioCtxRef.current.sampleRate,
      });

      playbackQueueRef.current = new AudioPlaybackQueue(
        audioCtxRef.current,
        () => {
          if (
            turnStartedAtRef.current &&
            diagnosticsRef.current.metrics.firstAudioFramePlayedMs === null
          ) {
            patchMetrics({ firstAudioFramePlayedMs: performance.now() - turnStartedAtRef.current });
            console.warn('[VOICE:G3] first_audio_played', { sessionAttemptId });
          }
        },
        () => {
          // onDrain: all scheduled audio buffers finished playing.
          // If Gemini already sent turnComplete, now transition to listening.
          // This keeps barge-in active during the audio tail and ensures
          // the UI state matches what the user actually hears.
          if (turnCompleteReceivedRef.current) {
            turnCompleteReceivedRef.current = false;
            modelRespondingRef.current = false;
            if (drainTimeoutRef.current) {
              clearTimeout(drainTimeoutRef.current);
              drainTimeoutRef.current = null;
            }
            voiceLog('playback:drained', {});
            resetTurnAccumulators();
            resetMetricsForNewTurn();
            transition('listening', 'playback_drained');
          }
        },
        (rms: number) => {
          patchDiagnostics({ playbackRms: rms });
        },
      );

      // ── Gate 2: Open WebSocket directly to Vertex AI ──
      patchDiagnostics({ substep: 'Opening audio channel…' });
      const vertexWsUrl = `${sessionData.websocketUrl}?access_token=${sessionData.accessToken}`;
      console.warn('[VOICE:G2] ws_connecting', {
        sessionAttemptId,
        wsUrl: sessionData.websocketUrl,
        msFromStart: Math.round(performance.now() - t0),
      });
      voiceLog('ws:connecting', {
        sessionId,
        vertexUrl: sessionData.websocketUrl,
        audioContextState: audioCtxRef.current?.state,
        audioContextSampleRate: audioCtxRef.current?.sampleRate,
      });
      const ws = new WebSocket(vertexWsUrl);
      wsRef.current = ws;

      // Track first N inbound WS messages for Gate 2 diagnostics
      let wsMessageCount = 0;

      let setupTimeoutId: ReturnType<typeof setTimeout> | undefined;
      const clearSetupTimeout = () => {
        if (setupTimeoutId !== undefined) {
          clearTimeout(setupTimeoutId);
          setupTimeoutId = undefined;
        }
      };

      ws.onopen = () => {
        patchDiagnostics({ connectionStatus: 'open' });
        console.warn('[VOICE:G2] ws_opened', {
          sessionAttemptId,
          readyState: ws.readyState,
          msFromStart: Math.round(performance.now() - t0),
        });
        debugLog('ws_open', {});
        voiceLog('ws:opened', { readyState: ws.readyState });
        voiceLog('timing:wsOpen', { ms: Math.round(performance.now() - sessionStartedAt) });

        // Send setup message directly to Vertex AI — session endpoint built it for us
        if (ws.readyState === WebSocket.OPEN) {
          console.warn('[VOICE:G2] sending_setup', { sessionAttemptId });
          ws.send(JSON.stringify(sessionData.setupMessage));
        }
        setupTimeoutId = setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            const msg = `Voice setup timed out after ${WEBSOCKET_SETUP_TIMEOUT_MS / 1000}s (received ${wsMessageCount} messages). Please try again.`;
            console.warn('[VOICE:G2] ws_setup_timeout', {
              sessionAttemptId,
              wsMessageCount,
              msFromStart: Math.round(performance.now() - t0),
            });
            recordVoiceFailure(msg);

            // Auto-reconnect only if we've had a prior successful session
            if (
              autoReconnectAllowedRef.current &&
              autoReconnectCountRef.current < MAX_AUTO_RECONNECT_RETRIES &&
              !isCircuitBreakerOpen()
            ) {
              autoReconnectCountRef.current += 1;
              const attempt = autoReconnectCountRef.current;
              voiceLog('auto_reconnect:setup_timeout', {
                attempt,
                max: MAX_AUTO_RECONNECT_RETRIES,
              });
              patchDiagnostics({ substep: `Retrying… (${attempt}/${MAX_AUTO_RECONNECT_RETRIES})` });
              transition('requesting_mic', 'auto_reconnect_pending');
              setError(null);
              void cleanup().then(() => {
                autoReconnectTimerRef.current = setTimeout(() => {
                  autoReconnectTimerRef.current = null;
                  void startSessionRef.current();
                }, AUTO_RECONNECT_DELAY_MS);
              });
              return;
            }

            onErrorRef.current?.(msg);
            setError(msg);
            transition('error', 'setup_timeout');
            void cleanup();
          }
        }, WEBSOCKET_SETUP_TIMEOUT_MS);
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          wsMessageCount += 1;

          // Gate 2: Log first 5 inbound message types
          if (wsMessageCount <= 5) {
            console.warn(`[VOICE:G2] ws_message_${wsMessageCount}`, {
              sessionAttemptId,
              keys: Object.keys(data),
              hasSetupComplete:
                Object.prototype.hasOwnProperty.call(data, 'setupComplete') ||
                Object.prototype.hasOwnProperty.call(data, 'setup_complete'),
              hasError: !!data.error,
            });
          }

          if (data.error) {
            voiceLog('ws:serverError', { code: data.error?.code, message: data.error?.message });
            clearSetupTimeout();
            const code: number | undefined = data.error?.code;
            const serverMsg = String(data.error?.message || 'Voice session error');
            const userMsg =
              code === 429
                ? 'Voice rate limit reached — please wait a moment and try again.'
                : code === 503
                  ? 'Voice service temporarily unavailable — please try again.'
                  : mapSessionError(serverMsg);
            recordVoiceFailure(userMsg);
            onErrorRef.current?.(userMsg);
            setError(userMsg);
            patchDiagnostics({ lastError: userMsg, connectionStatus: 'error' });
            transition('error', 'server_error');
            void cleanup();
            return;
          }

          // Handle goAway — server signals session is ending soon.
          // Store resumption token if provided for future reconnection.
          const goAwayData = data.goAway || data.go_away;
          if (goAwayData) {
            const timeLeft = goAwayData.timeLeft || goAwayData.time_left;
            voiceLog('server:goAway', { timeLeft });
            console.warn('[VOICE:G2] go_away_received', {
              sessionAttemptId,
              timeLeft,
            });
            // Store session resumption token if provided (for future reconnect support)
            const resumptionToken =
              goAwayData.sessionResumptionToken || goAwayData.session_resumption_token;
            if (resumptionToken) {
              resumptionTokenRef.current = resumptionToken;
              voiceLog('server:resumptionToken', { hasToken: true });
            }
            onErrorRef.current?.('Voice session ending soon. You may need to restart.');
            patchDiagnostics({ lastError: 'Session ending (goAway received)' });
          }

          // Handle session resumption updates
          const resumptionUpdate = data.sessionResumptionUpdate || data.session_resumption_update;
          if (resumptionUpdate) {
            const token = resumptionUpdate.newHandle || resumptionUpdate.new_handle;
            if (token) {
              resumptionTokenRef.current = token;
              voiceLog('server:resumptionUpdate', { hasToken: true });
            }
          }

          // Vertex AI may use snake_case field names; handle both conventions
          const sc_content = data.serverContent || data.server_content;
          const setupComplete =
            Object.prototype.hasOwnProperty.call(data, 'setupComplete') ||
            Object.prototype.hasOwnProperty.call(data, 'setup_complete') ||
            (sc_content != null &&
              (Object.prototype.hasOwnProperty.call(sc_content, 'setupComplete') ||
                Object.prototype.hasOwnProperty.call(sc_content, 'setup_complete')));

          if (setupComplete) {
            console.warn('[VOICE:G2] ws_setup_complete', {
              sessionAttemptId,
              msFromStart: Math.round(performance.now() - t0),
            });
            voiceLog('ws:setupComplete', {
              sessionId,
              audioContextState: audioCtxRef.current?.state,
              hasMediaStream: !!mediaStreamRef.current,
            });
            voiceLog('timing:setupComplete', {
              ms: Math.round(performance.now() - sessionStartedAt),
            });
            clearSetupTimeout();
            isStartingRef.current = false;

            // No session expiry timer needed — Vertex AI access tokens last 1hr
            // and the session will send goAway before expiry. On reconnect we
            // fetch a fresh token from gemini-voice-session.

            // Start keepalive ping — sends an empty audio chunk periodically to keep
            // the WebSocket alive and detect dead connections before the browser's
            // built-in timeout (often 60s+). If the WS is no longer open, the
            // interval self-clears.
            keepaliveIntervalRef.current = setInterval(() => {
              if (ws.readyState !== WebSocket.OPEN) {
                if (keepaliveIntervalRef.current) {
                  clearInterval(keepaliveIntervalRef.current);
                  keepaliveIntervalRef.current = null;
                }
                return;
              }
              ws.send(
                JSON.stringify({
                  realtimeInput: {
                    mediaChunks: [{ mimeType: LIVE_INPUT_MIME, data: SILENT_KEEPALIVE_FRAME }],
                  },
                }),
              );
              voiceLog('keepalive:sent', {});
            }, WS_KEEPALIVE_INTERVAL_MS);

            transition('ready', 'setup_complete');
            patchDiagnostics({ substep: null });

            if (audioCtxRef.current && mediaStreamRef.current) {
              void (async () => {
                try {
                  captureHandleRef.current = await startAudioCapture(
                    mediaStreamRef.current!,
                    audioCtxRef.current!,
                    (base64PCM: string) => {
                      if (ws.readyState !== WebSocket.OPEN) return;
                      if (
                        turnStartedAtRef.current &&
                        diagnosticsRef.current.metrics.firstAudioChunkSentMs === null
                      ) {
                        patchMetrics({
                          firstAudioChunkSentMs: performance.now() - turnStartedAtRef.current,
                        });
                        console.warn('[VOICE:G3] first_audio_sent', { sessionAttemptId });
                      }
                      if (stateRef.current === 'ready' || stateRef.current === 'listening') {
                        transition('sending', 'audio_chunk_sent');
                      }
                      ws.send(
                        JSON.stringify({
                          realtimeInput: {
                            mediaChunks: [{ mimeType: LIVE_INPUT_MIME, data: base64PCM }],
                          },
                        }),
                      );
                    },
                    rms => {
                      patchDiagnostics({ micRms: rms });
                      if (rms > BARGE_IN_RMS_THRESHOLD && modelRespondingRef.current) {
                        flushModelOutput();
                        sendCancelSignal();
                        transition('interrupted', 'barge_in_detected');
                        transition('listening', 'resume_after_interrupt');
                      }
                    },
                    { diagnosticsEnabled: VOICE_DIAGNOSTICS_ENABLED },
                  );
                  // Successful capture → mark session successful
                  recordCircuitBreakerSuccess();
                  hasHadSuccessfulSessionRef.current = true;
                  autoReconnectAllowedRef.current = true;
                  autoReconnectCountRef.current = 0;
                  transition('listening', 'capture_started');
                } catch (captureErr) {
                  const msg =
                    captureErr instanceof Error
                      ? captureErr.message
                      : 'Failed to start audio capture';
                  recordVoiceFailure(msg);
                  onErrorRef.current?.(msg);
                  setError(msg);
                  transition('error', 'capture_failed');
                  void cleanup();
                }
              })();
            } else {
              transition('listening', 'capture_started');
            }
            return;
          }

          // Handle tool calls (both camelCase and snake_case)
          const toolCallData = data.toolCall || data.tool_call;
          if (toolCallData) {
            const fnCalls = toolCallData.functionCalls || toolCallData.function_calls || [];
            voiceLog('server:toolCall', {
              functions: (fnCalls as Array<{ name: string }>).map(fc => fc.name),
            });
            void handleToolCallWs(ws, {
              functionCalls: fnCalls,
            });
            return;
          }

          // Handle server content (both camelCase and snake_case)
          const rawSc = data.serverContent || data.server_content;
          if (rawSc) {
            const sc = rawSc;

            if (sc.interrupted) {
              flushModelOutput();
              voiceLog('server:interrupted');
              playbackQueueRef.current?.flush();
              clearThinkingTimer();
              modelRespondingRef.current = false;
              if (cancelStartedAtRef.current) {
                patchMetrics({ cancelLatencyMs: performance.now() - cancelStartedAtRef.current });
                cancelStartedAtRef.current = null;
              }

              const partialUser = userTranscriptAccRef.current.trim();
              const partialAssistant = assistantTranscriptAccRef.current.trim();
              emitTurnComplete(partialUser, partialAssistant);

              resetTurnAccumulators();
              transition('interrupted', 'server_interrupted');
              transition('listening', 'awaiting_next_turn');
              return;
            }

            // Vertex AI may use snake_case (model_turn, inline_data) while
            // AI Studio uses camelCase (modelTurn, inlineData). Handle both.
            const modelTurn = sc.modelTurn || sc.model_turn;
            const parts = modelTurn?.parts || [];
            if (parts.length > 0 && !modelRespondingRef.current) {
              modelRespondingRef.current = true;
              if (
                turnStartedAtRef.current &&
                diagnosticsRef.current.metrics.firstTokenReceivedMs === null
              ) {
                patchMetrics({
                  firstTokenReceivedMs: performance.now() - turnStartedAtRef.current,
                });
                console.warn('[VOICE:G3] first_audio_received', { sessionAttemptId });
              }
            }

            for (const part of parts) {
              const inlineData = part.inlineData || part.inline_data;
              if (inlineData?.data) {
                // Proactive audio: model may speak first without user input.
                // Resume AudioContext (required on iOS after user gesture) and
                // transition to playing regardless of prior state.
                transition('playing', 'model_audio_received');
                void audioCtxRef.current?.resume().catch(() => {});
                if (!modelRespondingRef.current) {
                  voiceLog('server:firstAudioChunk', {
                    mimeType: inlineData.mimeType || inlineData.mime_type,
                    dataLen: inlineData.data.length,
                    proactive: !userHasSpokenRef.current,
                  });
                }
                setState('playing');
                playbackQueueRef.current?.enqueue(inlineData.data);
              }
              if (typeof part.text === 'string' && part.text.length > 0) {
                transition('playing', 'model_text_received');
                assistantTranscriptAccRef.current += part.text;
                setAssistantTranscript(assistantTranscriptAccRef.current);
              }
            }

            // Handle input transcript (user speech-to-text)
            const inputTranscript = sc.inputTranscript || sc.input_transcript;
            if (inputTranscript) {
              clearThinkingTimer();
              const transcript =
                typeof inputTranscript === 'string' ? inputTranscript : inputTranscript?.text || '';
              if (transcript) {
                userHasSpokenRef.current = true;
                userTranscriptAccRef.current = transcript;
                setUserTranscript(transcript);
                transition('listening', 'input_transcript');
                thinkingTimerRef.current = setTimeout(() => {
                  if (stateRef.current === 'listening') transition('sending', 'thinking_timeout');
                }, THINKING_DELAY_MS);
              }
            }

            // Handle output transcript (AI speech-to-text).
            // outputTranscript is the authoritative server-side transcription of
            // the model's audio. It replaces (not appends to) any text accumulated
            // from modelTurn parts, which may be partial or absent for audio-only
            // responses. This prevents duplicate text in the UI.
            const outputTranscript = sc.outputTranscript || sc.output_transcript;
            if (outputTranscript) {
              const transcript =
                typeof outputTranscript === 'string'
                  ? outputTranscript
                  : outputTranscript?.text || '';
              if (transcript) {
                assistantTranscriptAccRef.current = transcript;
                setAssistantTranscript(transcript);
              }
            }

            const isTurnComplete = sc.turnComplete || sc.turn_complete;
            if (isTurnComplete) {
              // Do NOT flush playback here — Gemini sends turnComplete when it
              // finishes *generating*, but audio buffers may still be scheduled
              // for playback. Flushing here cuts off the AI mid-sentence.
              // Flush only happens on: barge-in, manual interrupt, endSession.
              clearThinkingTimer();
              voiceLog('server:turnComplete', {
                userText: userTranscriptAccRef.current.slice(0, 50),
                assistantText: assistantTranscriptAccRef.current.slice(0, 50),
              });

              const finalUser = userTranscriptAccRef.current.trim();
              const finalAssistant = assistantTranscriptAccRef.current.trim();
              emitTurnComplete(finalUser, finalAssistant);

              // Clear accumulators immediately so ws.onclose won't re-emit
              // the same turn if the socket drops during the playback tail.
              userTranscriptAccRef.current = '';
              assistantTranscriptAccRef.current = '';
              userHasSpokenRef.current = false;

              // If playback already drained (very short response or text-only),
              // transition immediately. Otherwise, keep modelRespondingRef true
              // so barge-in stays active during the audio tail, and let the
              // AudioPlaybackQueue.onDrain callback handle the transition.
              if (!playbackQueueRef.current?.isPlaying) {
                modelRespondingRef.current = false;
                resetTurnAccumulators();
                resetMetricsForNewTurn();
                transition('listening', 'turn_complete');
              } else {
                turnCompleteReceivedRef.current = true;
                // Safety: if onDrain doesn't fire within 5s (e.g. AudioContext
                // issue), force the transition so we don't get stuck.
                drainTimeoutRef.current = setTimeout(() => {
                  if (turnCompleteReceivedRef.current) {
                    voiceLog('playback:drain_timeout', {});
                    turnCompleteReceivedRef.current = false;
                    modelRespondingRef.current = false;
                    resetTurnAccumulators();
                    resetMetricsForNewTurn();
                    transition('listening', 'turn_complete_drain_timeout');
                  }
                }, 5_000);
              }
            }
          }
        } catch {
          // Ignore malformed frames
        }
      };

      ws.onerror = ev => {
        console.warn('[VOICE:G2] ws_error', {
          sessionAttemptId,
          type: (ev as ErrorEvent).message ?? 'unknown',
        });
        voiceLog('ws:error', { sessionId, type: (ev as ErrorEvent).message ?? 'unknown' });
        clearSetupTimeout();
        patchDiagnostics({ connectionStatus: 'error' });
      };

      ws.onclose = event => {
        console.warn('[VOICE:G2] ws_closed', {
          sessionAttemptId,
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        voiceLog('ws:closed', { code: event.code, reason: event.reason, wasClean: event.wasClean });
        clearSetupTimeout();
        const msg = mapWsCloseError(event.code, event.reason);
        patchDiagnostics({
          connectionStatus: 'closed',
          wsCloseCode: event.code,
          wsCloseReason: event.reason || null,
          reconnectAttempts: diagnosticsRef.current.reconnectAttempts + 1,
        });

        const pendingUser = userTranscriptAccRef.current.trim();
        const pendingAssistant = assistantTranscriptAccRef.current.trim();
        emitTurnComplete(pendingUser, pendingAssistant);

        if (msg) {
          recordVoiceFailure(msg);

          // Auto-reconnect only if we've had a successful session before and retries remain
          if (
            autoReconnectAllowedRef.current &&
            autoReconnectCountRef.current < MAX_AUTO_RECONNECT_RETRIES &&
            !isCircuitBreakerOpen()
          ) {
            autoReconnectCountRef.current += 1;
            const attempt = autoReconnectCountRef.current;
            voiceLog('auto_reconnect:scheduling', { attempt, max: MAX_AUTO_RECONNECT_RETRIES });
            patchDiagnostics({ substep: `Retrying… (${attempt}/${MAX_AUTO_RECONNECT_RETRIES})` });
            transition('requesting_mic', 'auto_reconnect_pending');
            setError(null);
            void cleanup().then(() => {
              autoReconnectTimerRef.current = setTimeout(() => {
                autoReconnectTimerRef.current = null;
                voiceLog('auto_reconnect:starting', {});
                void startSessionRef.current();
              }, AUTO_RECONNECT_DELAY_MS);
            });
            return;
          }

          onErrorRef.current?.(msg);
          setError(msg);
          patchDiagnostics({ lastError: msg });
          transition('error', 'ws_closed_with_error');
        } else {
          transition('idle', 'ws_closed_cleanly');
        }
        void cleanup();
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to start voice session.';
      recordVoiceFailure(errMsg);

      // Auto-reconnect only if we've had a successful session before
      if (
        autoReconnectAllowedRef.current &&
        autoReconnectCountRef.current < MAX_AUTO_RECONNECT_RETRIES &&
        !isCircuitBreakerOpen()
      ) {
        autoReconnectCountRef.current += 1;
        const attempt = autoReconnectCountRef.current;
        voiceLog('auto_reconnect:scheduling_from_catch', {
          errMsg,
          attempt,
          max: MAX_AUTO_RECONNECT_RETRIES,
        });
        patchDiagnostics({ substep: `Retrying… (${attempt}/${MAX_AUTO_RECONNECT_RETRIES})` });
        transition('requesting_mic', 'auto_reconnect_pending');
        setError(null);
        void cleanup().then(() => {
          autoReconnectTimerRef.current = setTimeout(() => {
            autoReconnectTimerRef.current = null;
            voiceLog('auto_reconnect:starting', {});
            void startSessionRef.current();
          }, AUTO_RECONNECT_DELAY_MS);
        });
        return;
      }

      onErrorRef.current?.(errMsg);
      setError(errMsg);
      patchDiagnostics({ lastError: errMsg, connectionStatus: 'error' });
      transition('error', 'start_failed');
      toast.error(errMsg);
      void cleanup();
    }
  }, [
    isSupported,
    tripId,
    voice,
    cleanup,
    clearThinkingTimer,
    debugLog,
    emitTurnComplete,
    flushModelOutput,
    handleToolCallWs,
    patchDiagnostics,
    patchMetrics,
    resetMetricsForNewTurn,
    resetTurnAccumulators,
    sendCancelSignal,
    transition,
    recordVoiceFailure,
  ]);

  // Keep ref in sync so auto-reconnect setTimeout always calls the latest version
  useEffect(() => {
    startSessionRef.current = startSession;
  }, [startSession]);

  const interruptPlayback = useCallback(() => {
    flushModelOutput();
    sendCancelSignal();
    modelRespondingRef.current = false;

    const partialUser = userTranscriptAccRef.current.trim();
    const partialAssistant = assistantTranscriptAccRef.current.trim();
    emitTurnComplete(partialUser, partialAssistant);

    resetTurnAccumulators();
    transition('interrupted', 'manual_interrupt');
    transition('listening', 'post_manual_interrupt');
  }, [emitTurnComplete, flushModelOutput, resetTurnAccumulators, sendCancelSignal, transition]);

  const endSession = useCallback(async () => {
    const pendingUser = userTranscriptAccRef.current.trim();
    const pendingAssistant = assistantTranscriptAccRef.current.trim();
    emitTurnComplete(pendingUser, pendingAssistant);

    resetTurnAccumulators();
    resumptionTokenRef.current = null;
    setError(null);
    transition('idle', 'user_end_session');
    await cleanup();
  }, [cleanup, emitTurnComplete, resetTurnAccumulators, transition]);

  const handleResetCircuitBreaker = useCallback(() => {
    resetCircuitBreaker();
    setCircuitBreakerOpen(false);
    setError(null);
    setState('idle');
    autoReconnectCountRef.current = 0;
  }, []);

  return {
    state,
    error,
    userTranscript,
    assistantTranscript,
    conversationHistory,
    diagnostics,
    startSession,
    endSession,
    interruptPlayback,
    sendImage,
    isSupported,
    circuitBreakerOpen,
    resetCircuitBreaker: handleResetCircuitBreaker,
  };
}

export { uniqueId };
