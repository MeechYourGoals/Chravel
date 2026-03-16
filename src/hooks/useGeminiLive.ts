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
  ensureAudioContextResumed,
  AUDIO_CONTRACT,
} from '@/voice/audioContract';
import { telemetry } from '@/telemetry/service';
import {
  LIVE_INPUT_MIME,
  WEBSOCKET_SETUP_TIMEOUT_MS,
  THINKING_DELAY_MS,
  BARGE_IN_RMS_THRESHOLD,
  WS_KEEPALIVE_INTERVAL_MS,
  AUTO_RECONNECT_DELAY_MS,
  MAX_AUTO_RECONNECT_RETRIES,
  SILENT_KEEPALIVE_FRAME,
  SafeAudioContext,
  voiceLog,
  uniqueId,
  mapSessionError,
  mapWsCloseError,
} from '@/voice/liveConstants';
import { useVoiceDiagnostics, initialDiagnostics } from '@/hooks/useVoiceDiagnostics';
import {
  VoiceWebSocketManager,
  type VoiceWsCallbacks,
  type WsModelPart,
} from '@/voice/VoiceWebSocketManager';
import { AdaptiveVad } from '@/voice/adaptiveVad';

export type GeminiLiveState =
  | 'idle'
  | 'requesting_mic'
  | 'reconnecting'
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
  const stateRef = useRef<GeminiLiveState>('idle');
  const [circuitBreakerOpen, setCircuitBreakerOpen] = useState(false);

  // ── Diagnostics subsystem (extracted hook) ──
  const {
    diagnostics,
    diagnosticsRef,
    patchDiagnostics,
    patchMetrics,
    micRmsRef,
    playbackRmsRef,
    startRmsFlush,
    stopRmsFlush,
  } = useVoiceDiagnostics();

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
  // iOS Safari: visibility change handler for AudioContext resume on foreground
  const visibilityHandlerRef = useRef<(() => void) | null>(null);
  // WebSocket manager instance for current session
  const wsManagerRef = useRef<VoiceWebSocketManager | null>(null);
  // Adaptive VAD for dynamic barge-in threshold
  const vadRef = useRef<AdaptiveVad | null>(null);

  /** Session-level metrics accumulated for telemetry emission on cleanup. */
  const sessionMetricsRef = useRef({
    startedAt: 0,
    turnCount: 0,
    toolCallCount: 0,
    bargeInCount: 0,
    reconnects: 0,
    closeCode: null as number | null,
    lastError: null as string | null,
  });

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

  const debugLog = useCallback(
    (event: string, payload: Record<string, unknown> = {}) => {
      if (!diagnosticsRef.current.enabled) return;
      console.debug('[GeminiLive]', event, payload);
    },
    [diagnosticsRef],
  );

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

  const recordVoiceFailure = useCallback(
    (errMsg: string) => {
      sessionMetricsRef.current.lastError = errMsg;
      telemetry.track('voice_error', { trip_id: tripId, error: errMsg, phase: stateRef.current });
      telemetry.captureError(new Error(errMsg), { trip_id: tripId, phase: stateRef.current });
      const justOpened = recordFailure(errMsg);
      if (justOpened) {
        setCircuitBreakerOpen(true);
        onCircuitBreakerOpenRef.current?.();
      }
    },
    [tripId],
  );

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

    stopRmsFlush();
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

    // Remove iOS Safari visibility change listener
    if (visibilityHandlerRef.current) {
      document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
      visibilityHandlerRef.current = null;
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

    // Disconnect via manager (handles timers + WS cleanup)
    if (wsManagerRef.current) {
      wsManagerRef.current.disconnect();
      wsManagerRef.current = null;
    }
    wsRef.current = null;

    patchDiagnostics({
      connectionStatus: 'closed',
      audioContextState: 'unavailable',
      audioSampleRate: null,
      micRms: 0,
      playbackRms: 0,
      substep: null,
    });

    // Emit session-ended telemetry if a session was active
    const sm = sessionMetricsRef.current;
    if (sm.startedAt > 0) {
      telemetry.track('voice_session_ended', {
        trip_id: tripId,
        duration_ms: Date.now() - sm.startedAt,
        turns: sm.turnCount,
        tool_calls: sm.toolCallCount,
        barge_ins: sm.bargeInCount,
        reconnects: sm.reconnects,
        close_code: sm.closeCode,
        error: sm.lastError,
      });
      sessionMetricsRef.current.startedAt = 0;
    }

    isCleaningUpRef.current = false;
  }, [clearThinkingTimer, patchDiagnostics, stopRmsFlush, tripId]);

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
            sessionMetricsRef.current.toolCallCount += 1;
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

      // iOS Safari: resume AudioContext when page returns to foreground
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      visibilityHandlerRef.current = handleVisibilityChange;

      // iOS Safari: handle interrupted state (phone call, Siri activation)
      audioCtxRef.current.addEventListener('statechange', () => {
        const ctxState = audioCtxRef.current?.state;
        patchDiagnostics({ audioContextState: ctxState ?? 'unavailable' });
        if (ctxState === 'interrupted' || ctxState === 'suspended') {
          audioCtxRef.current?.resume().catch(() => {});
        }
      });

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

      // Resume AudioContext after async gap (iOS Safari suspends during getUserMedia)
      await ensureAudioContextResumed(audioCtxRef.current);

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
          playbackRmsRef.current = rms;
        },
      );

      // ── Gate 2: Open WebSocket via VoiceWebSocketManager ──
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

      // Helper: attempt auto-reconnect if allowed
      const tryAutoReconnect = (reason: string): boolean => {
        if (
          autoReconnectAllowedRef.current &&
          autoReconnectCountRef.current < MAX_AUTO_RECONNECT_RETRIES &&
          !isCircuitBreakerOpen()
        ) {
          autoReconnectCountRef.current += 1;
          const attempt = autoReconnectCountRef.current;
          voiceLog(`auto_reconnect:${reason}`, { attempt, max: MAX_AUTO_RECONNECT_RETRIES });
          patchDiagnostics({
            substep: `Reconnecting… (${attempt}/${MAX_AUTO_RECONNECT_RETRIES})`,
          });
          transition('reconnecting', 'auto_reconnect_pending');
          setError(null);
          void cleanup().then(() => {
            autoReconnectTimerRef.current = setTimeout(() => {
              autoReconnectTimerRef.current = null;
              void startSessionRef.current();
            }, AUTO_RECONNECT_DELAY_MS);
          });
          return true;
        }
        return false;
      };

      const wsCallbacks: VoiceWsCallbacks = {
        onOpen: () => {
          patchDiagnostics({ connectionStatus: 'open' });
          debugLog('ws_open', {});
        },
        onSetupComplete: () => {
          voiceLog('ws:setupComplete', { sessionId });
          isStartingRef.current = false;
          transition('ready', 'setup_complete');
          patchDiagnostics({ substep: null });

          // Initialize adaptive VAD for this session
          vadRef.current = new AdaptiveVad();

          if (audioCtxRef.current && mediaStreamRef.current) {
            const currentWs = wsManagerRef.current;
            void (async () => {
              try {
                captureHandleRef.current = await startAudioCapture(
                  mediaStreamRef.current!,
                  audioCtxRef.current!,
                  (base64PCM: string) => {
                    if (
                      !currentWs?.getWebSocket() ||
                      currentWs.getWebSocket()?.readyState !== WebSocket.OPEN
                    )
                      return;
                    if (
                      turnStartedAtRef.current &&
                      diagnosticsRef.current.metrics.firstAudioChunkSentMs === null
                    ) {
                      patchMetrics({
                        firstAudioChunkSentMs: performance.now() - turnStartedAtRef.current,
                      });
                    }
                    if (stateRef.current === 'ready' || stateRef.current === 'listening') {
                      transition('sending', 'audio_chunk_sent');
                    }
                    currentWs.sendAudio(base64PCM);
                  },
                  rms => {
                    micRmsRef.current = rms;
                    // Feed calibration frames to adaptive VAD during initial listening
                    const vad = vadRef.current;
                    if (vad && !vad.isCalibrated()) {
                      vad.calibrate(rms);
                      if (vad.isCalibrated()) {
                        voiceLog('vad:calibrated', { threshold: vad.getThreshold() });
                      }
                    }
                    // Use adaptive VAD for barge-in if calibrated, else static threshold
                    const isVoice = vad ? vad.detect(rms) : rms > BARGE_IN_RMS_THRESHOLD;
                    if (isVoice && modelRespondingRef.current) {
                      flushModelOutput();
                      sendCancelSignal();
                      sessionMetricsRef.current.bargeInCount += 1;
                      telemetry.track('voice_barge_in', { trip_id: tripId });
                      transition('interrupted', 'barge_in_detected');
                      transition('listening', 'resume_after_interrupt');
                    }
                  },
                  { diagnosticsEnabled: VOICE_DIAGNOSTICS_ENABLED },
                );
                recordCircuitBreakerSuccess();
                hasHadSuccessfulSessionRef.current = true;
                autoReconnectAllowedRef.current = true;
                sessionMetricsRef.current = {
                  startedAt: Date.now(),
                  turnCount: 0,
                  toolCallCount: 0,
                  bargeInCount: 0,
                  reconnects: autoReconnectCountRef.current,
                  closeCode: null,
                  lastError: null,
                };
                telemetry.track('voice_session_started', {
                  trip_id: tripId,
                  voice,
                  auto_reconnect_attempt: autoReconnectCountRef.current,
                });
                autoReconnectCountRef.current = 0;
                startRmsFlush();
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
            startRmsFlush();
            transition('listening', 'capture_started');
          }
        },
        onSetupTimeout: (msgCount: number) => {
          const msg = `Voice setup timed out after ${WEBSOCKET_SETUP_TIMEOUT_MS / 1000}s (received ${msgCount} messages). Please try again.`;
          recordVoiceFailure(msg);
          if (tryAutoReconnect('setup_timeout')) return true;
          onErrorRef.current?.(msg);
          setError(msg);
          transition('error', 'setup_timeout');
          void cleanup();
          return true;
        },
        onServerError: err => {
          recordVoiceFailure(err.userMessage);
          onErrorRef.current?.(err.userMessage);
          setError(err.userMessage);
          patchDiagnostics({ lastError: err.userMessage, connectionStatus: 'error' });
          transition('error', 'server_error');
          void cleanup();
        },
        onGoAway: data => {
          if (data.resumptionToken) {
            resumptionTokenRef.current = data.resumptionToken;
          }
          onErrorRef.current?.('Voice session ending soon. You may need to restart.');
          patchDiagnostics({ lastError: 'Session ending (goAway received)' });
        },
        onResumptionUpdate: data => {
          resumptionTokenRef.current = data.token;
        },
        onInterrupted: () => {
          flushModelOutput();
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
        },
        onModelParts: (parts: WsModelPart[]) => {
          if (parts.length > 0 && !modelRespondingRef.current) {
            modelRespondingRef.current = true;
            if (
              turnStartedAtRef.current &&
              diagnosticsRef.current.metrics.firstTokenReceivedMs === null
            ) {
              patchMetrics({
                firstTokenReceivedMs: performance.now() - turnStartedAtRef.current,
              });
            }
          }
          for (const part of parts) {
            if (part.audioData) {
              transition('playing', 'model_audio_received');
              void audioCtxRef.current?.resume().catch(() => {});
              setState('playing');
              playbackQueueRef.current?.enqueue(part.audioData);
            }
            if (part.text && part.text.length > 0) {
              transition('playing', 'model_text_received');
              assistantTranscriptAccRef.current += part.text;
              setAssistantTranscript(assistantTranscriptAccRef.current);
            }
          }
        },
        onInputTranscript: data => {
          clearThinkingTimer();
          userHasSpokenRef.current = true;
          const prev = userTranscriptAccRef.current;
          if (data.text.length >= prev.length || !prev.startsWith(data.text)) {
            userTranscriptAccRef.current = data.text;
            setUserTranscript(data.text);
          }
          transition('listening', 'input_transcript');
          thinkingTimerRef.current = setTimeout(() => {
            if (stateRef.current === 'listening') transition('sending', 'thinking_timeout');
          }, THINKING_DELAY_MS);
        },
        onOutputTranscript: data => {
          assistantTranscriptAccRef.current = data.text;
          setAssistantTranscript(data.text);
        },
        onTurnComplete: () => {
          clearThinkingTimer();
          voiceLog('server:turnComplete', {
            userText: userTranscriptAccRef.current.slice(0, 50),
            assistantText: assistantTranscriptAccRef.current.slice(0, 50),
          });
          sessionMetricsRef.current.turnCount += 1;
          const finalUser = userTranscriptAccRef.current.trim();
          const finalAssistant = assistantTranscriptAccRef.current.trim();
          emitTurnComplete(finalUser, finalAssistant);
          userTranscriptAccRef.current = '';
          assistantTranscriptAccRef.current = '';
          userHasSpokenRef.current = false;
          if (!playbackQueueRef.current?.isPlaying) {
            modelRespondingRef.current = false;
            resetTurnAccumulators();
            resetMetricsForNewTurn();
            transition('listening', 'turn_complete');
          } else {
            turnCompleteReceivedRef.current = true;
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
        },
        onToolCall: data => {
          const ws = wsManagerRef.current?.getWebSocket();
          if (ws) {
            void handleToolCallWs(ws, { functionCalls: data.functionCalls });
          }
        },
        onError: () => {
          patchDiagnostics({ connectionStatus: 'error' });
        },
        onClose: (code, reason, errMsg) => {
          sessionMetricsRef.current.closeCode = code;
          patchDiagnostics({
            connectionStatus: 'closed',
            wsCloseCode: code,
            wsCloseReason: reason || null,
            reconnectAttempts: diagnosticsRef.current.reconnectAttempts + 1,
          });
          const pendingUser = userTranscriptAccRef.current.trim();
          const pendingAssistant = assistantTranscriptAccRef.current.trim();
          emitTurnComplete(pendingUser, pendingAssistant);
          if (errMsg) {
            recordVoiceFailure(errMsg);
            if (tryAutoReconnect('ws_close')) return;
            onErrorRef.current?.(errMsg);
            setError(errMsg);
            patchDiagnostics({ lastError: errMsg });
            transition('error', 'ws_closed_with_error');
          } else {
            transition('idle', 'ws_closed_cleanly');
          }
          void cleanup();
        },
      };

      const manager = new VoiceWebSocketManager({
        callbacks: wsCallbacks,
        sessionAttemptId,
        setupMessage: sessionData.setupMessage,
        t0,
      });
      wsManagerRef.current = manager;
      const ws = manager.connect(vertexWsUrl);
      wsRef.current = ws;
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
        patchDiagnostics({ substep: `Reconnecting… (${attempt}/${MAX_AUTO_RECONNECT_RETRIES})` });
        transition('reconnecting', 'auto_reconnect_pending');
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
    startRmsFlush,
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

// Re-export uniqueId from liveConstants for backward compatibility
export { uniqueId } from '@/voice/liveConstants';
