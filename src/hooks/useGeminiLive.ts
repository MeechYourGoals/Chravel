import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AudioPlaybackQueue } from '@/lib/geminiLive/audioPlayback';
import { startAudioCapture, type AudioCaptureHandle } from '@/lib/geminiLive/audioCapture';

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
  wsCloseCode: number | null;
  wsCloseReason: string | null;
  reconnectAttempts: number;
  lastError: string | null;
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

interface UseGeminiLiveOptions {
  tripId: string;
  voice?: string;
  onToolCall?: (call: ToolCallRequest) => Promise<Record<string, unknown>>;
  onTurnComplete?: (userText: string, assistantText: string) => void;
  onError?: (message: string) => void;
}

interface UseGeminiLiveReturn {
  state: GeminiLiveState;
  error: string | null;
  userTranscript: string;
  assistantTranscript: string;
  diagnostics: VoiceDiagnostics;
  startSession: () => Promise<void>;
  endSession: () => void;
  interruptPlayback: () => void;
  sendImage: (mimeType: string, base64Data: string) => void;
  isSupported: boolean;
}

const LIVE_INPUT_MIME = 'audio/pcm;rate=16000';
const SESSION_TIMEOUT_MS = 30_000;
const WEBSOCKET_SETUP_TIMEOUT_MS = 15_000;
const THINKING_DELAY_MS = 1_500;
const BARGE_IN_RMS_THRESHOLD = 0.035;

const SafeAudioContext: typeof AudioContext | undefined =
  typeof window !== 'undefined'
    ? (window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    : undefined;

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
  if (reason) return reason;
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
  wsCloseCode: null,
  wsCloseReason: null,
  reconnectAttempts: 0,
  lastError: null,
  metrics: {
    firstAudioChunkSentMs: null,
    firstTokenReceivedMs: null,
    firstAudioFramePlayedMs: null,
    cancelLatencyMs: null,
  },
};

export function useGeminiLive({
  tripId,
  voice = 'Puck',
  onToolCall,
  onTurnComplete,
  onError,
}: UseGeminiLiveOptions): UseGeminiLiveReturn {
  const [state, setState] = useState<GeminiLiveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [diagnostics, setDiagnostics] = useState<VoiceDiagnostics>(initialDiagnostics);

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

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureHandleRef = useRef<AudioCaptureHandle | null>(null);
  const playbackQueueRef = useRef<AudioPlaybackQueue | null>(null);
  const isStartingRef = useRef(false);
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnStartedAtRef = useRef<number | null>(null);
  const cancelStartedAtRef = useRef<number | null>(null);

  const userTranscriptAccRef = useRef('');
  const assistantTranscriptAccRef = useRef('');
  const modelRespondingRef = useRef(false);
  const userHasSpokenRef = useRef(false);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof WebSocket !== 'undefined' &&
    SafeAudioContext !== undefined &&
    typeof navigator?.mediaDevices?.getUserMedia === 'function';

  const patchDiagnostics = useCallback((patch: Partial<VoiceDiagnostics>) => {
    setDiagnostics(prev => ({ ...prev, ...patch }));
  }, []);

  const patchMetrics = useCallback((patch: Partial<VoiceDiagnostics['metrics']>) => {
    setDiagnostics(prev => ({ ...prev, metrics: { ...prev.metrics, ...patch } }));
  }, []);

  const debugLog = useCallback(
    (event: string, payload: Record<string, unknown> = {}) => {
      if (!diagnostics.enabled) return;
      console.debug('[GeminiLive]', event, payload);
    },
    [diagnostics.enabled],
  );

  const transition = useCallback(
    (next: GeminiLiveState, reason: string) => {
      setState(prev => {
        if (prev !== next) {
          debugLog('state_transition', { from: prev, to: next, reason });
        }
        return next;
      });
    },
    [debugLog],
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

  const cleanup = useCallback(() => {
    isStartingRef.current = false;
    clearThinkingTimer();

    captureHandleRef.current?.stop();
    captureHandleRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    playbackQueueRef.current?.destroy();
    playbackQueueRef.current = null;

    if (audioCtxRef.current?.state !== 'closed') {
      audioCtxRef.current?.close().catch(() => {});
    }
    audioCtxRef.current = null;

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
    });
  }, [clearThinkingTimer, patchDiagnostics]);

  useEffect(() => () => cleanup(), [cleanup]);

  const prevTripIdRef = useRef(tripId);
  useEffect(() => {
    if (prevTripIdRef.current !== tripId && wsRef.current) {
      const pendingUser = userTranscriptAccRef.current.trim();
      const pendingAssistant = assistantTranscriptAccRef.current.trim();
      if (pendingUser || pendingAssistant) {
        onTurnCompleteRef.current?.(pendingUser, pendingAssistant);
      }
      cleanup();
      transition('idle', 'trip_changed');
      setError(null);
      setUserTranscript('');
      setAssistantTranscript('');
      userTranscriptAccRef.current = '';
      assistantTranscriptAccRef.current = '';
    }
    prevTripIdRef.current = tripId;
  }, [tripId, cleanup, transition]);

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
    modelRespondingRef.current = false;
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
        ws.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
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

  const startSession = useCallback(async () => {
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
      });
      setError(null);
      resetTurnAccumulators();
      resetMetricsForNewTurn();

      if (!SafeAudioContext) {
        throw new Error('Audio is not supported in this browser.');
      }

      audioCtxRef.current = new SafeAudioContext();
      void audioCtxRef.current.resume().catch(() => {});

      patchDiagnostics({
        audioContextState: audioCtxRef.current.state,
        audioSampleRate: audioCtxRef.current.sampleRate,
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

      const sessionPromise = supabase.functions.invoke('gemini-voice-session', {
        body: { tripId, voice },
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Voice session timed out. Please try again.')),
          SESSION_TIMEOUT_MS,
        ),
      );

      const { data: sessionData, error: sessionError } = (await Promise.race([
        sessionPromise,
        timeoutPromise,
      ])) as Awaited<typeof sessionPromise>;

      const accessToken =
        typeof sessionData?.accessToken === 'string' ? sessionData.accessToken : null;
      const sessionErrMsg =
        typeof (sessionData as { error?: string })?.error === 'string'
          ? (sessionData as { error: string }).error
          : sessionError?.message;

      if (sessionError || !accessToken) {
        const errMsg = mapSessionError(sessionErrMsg || 'Failed to get voice session');
        onErrorRef.current?.(errMsg);
        throw new Error(errMsg);
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (mediaErr) {
        const name = mediaErr instanceof Error ? mediaErr.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          throw new Error(
            'Microphone permission denied. Allow microphone access in your browser settings and try again.',
          );
        }
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          throw new Error('No microphone detected. Connect a microphone and try again.');
        }
        if (name === 'NotReadableError' || name === 'TrackStartError') {
          throw new Error(
            'Microphone is already in use by another app. Close other apps and try again.',
          );
        }
        throw new Error('Could not access microphone. Check your audio settings and try again.');
      }
      mediaStreamRef.current = stream;

      const track = stream.getAudioTracks()[0];
      patchDiagnostics({ micDeviceLabel: track?.label || null });

      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume().catch(() => {});
      }

      if (!audioCtxRef.current) throw new Error('Audio context lost.');

      playbackQueueRef.current = new AudioPlaybackQueue(audioCtxRef.current, () => {
        if (turnStartedAtRef.current && diagnostics.metrics.firstAudioFramePlayedMs === null) {
          patchMetrics({ firstAudioFramePlayedMs: performance.now() - turnStartedAtRef.current });
        }
      });

      const websocketUrl =
        typeof sessionData?.websocketUrl === 'string' && sessionData.websocketUrl.length > 0
          ? sessionData.websocketUrl
          : 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

      const wsUrl = `${websocketUrl}?access_token=${encodeURIComponent(accessToken)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      let setupTimeoutId: ReturnType<typeof setTimeout> | undefined;
      const clearSetupTimeout = () => {
        if (setupTimeoutId !== undefined) {
          clearTimeout(setupTimeoutId);
          setupTimeoutId = undefined;
        }
      };

      ws.onopen = () => {
        patchDiagnostics({ connectionStatus: 'open' });
        debugLog('ws_open', {});
        setupTimeoutId = setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            const msg = 'Voice connection timed out. Please try again.';
            onErrorRef.current?.(msg);
            setError(msg);
            transition('error', 'setup_timeout');
            cleanup();
          }
        }, WEBSOCKET_SETUP_TIMEOUT_MS);
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            clearSetupTimeout();
            const code: number | undefined = data.error?.code;
            const serverMsg = String(data.error?.message || 'Voice session error');
            const userMsg =
              code === 429
                ? 'Voice rate limit reached — please wait a moment and try again.'
                : code === 503
                  ? 'Voice service temporarily unavailable — please try again.'
                  : mapSessionError(serverMsg);
            onErrorRef.current?.(userMsg);
            setError(userMsg);
            patchDiagnostics({ lastError: userMsg, connectionStatus: 'error' });
            transition('error', 'server_error');
            cleanup();
            return;
          }

          const setupComplete =
            Object.prototype.hasOwnProperty.call(data, 'setupComplete') ||
            (data.serverContent != null &&
              Object.prototype.hasOwnProperty.call(data.serverContent, 'setupComplete'));

          if (setupComplete) {
            clearSetupTimeout();
            isStartingRef.current = false;
            transition('ready', 'setup_complete');

            if (audioCtxRef.current && mediaStreamRef.current) {
              captureHandleRef.current = startAudioCapture(
                mediaStreamRef.current,
                audioCtxRef.current,
                (base64PCM: string) => {
                  if (ws.readyState !== WebSocket.OPEN) return;
                  if (
                    turnStartedAtRef.current &&
                    diagnostics.metrics.firstAudioChunkSentMs === null
                  ) {
                    patchMetrics({
                      firstAudioChunkSentMs: performance.now() - turnStartedAtRef.current,
                    });
                  }
                  if (state === 'ready' || state === 'listening') {
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
              );
            }
            transition('listening', 'capture_started');
            return;
          }

          if (data.toolCall) {
            void handleToolCallWs(ws, data.toolCall);
            return;
          }

          if (data.serverContent) {
            const sc = data.serverContent;

            if (sc.interrupted) {
              flushModelOutput();
              modelRespondingRef.current = false;
              if (cancelStartedAtRef.current) {
                patchMetrics({ cancelLatencyMs: performance.now() - cancelStartedAtRef.current });
                cancelStartedAtRef.current = null;
              }

              const partialUser = userTranscriptAccRef.current.trim();
              const partialAssistant = assistantTranscriptAccRef.current.trim();
              if (partialUser || partialAssistant)
                onTurnCompleteRef.current?.(partialUser, partialAssistant);

              resetTurnAccumulators();
              transition('interrupted', 'server_interrupted');
              transition('listening', 'awaiting_next_turn');
              return;
            }

            const parts = sc.modelTurn?.parts || [];
            if (parts.length > 0 && !modelRespondingRef.current) {
              modelRespondingRef.current = true;
              if (turnStartedAtRef.current && diagnostics.metrics.firstTokenReceivedMs === null) {
                patchMetrics({
                  firstTokenReceivedMs: performance.now() - turnStartedAtRef.current,
                });
              }
            }

            for (const part of parts) {
              if (part.inlineData?.data) {
                transition('playing', 'model_audio_received');
                void audioCtxRef.current?.resume().catch(() => {});
                playbackQueueRef.current?.enqueue(part.inlineData.data);
              }
              if (typeof part.text === 'string' && part.text.length > 0) {
                transition('playing', 'model_text_received');
                assistantTranscriptAccRef.current += part.text;
                setAssistantTranscript(assistantTranscriptAccRef.current);
              }
            }

            if (sc.inputTranscript) {
              clearThinkingTimer();
              const transcript =
                typeof sc.inputTranscript === 'string'
                  ? sc.inputTranscript
                  : sc.inputTranscript?.text || '';
              if (transcript) {
                userHasSpokenRef.current = true;
                userTranscriptAccRef.current = transcript;
                setUserTranscript(transcript);
                transition('listening', 'input_transcript');
                thinkingTimerRef.current = setTimeout(() => {
                  if (state === 'listening') transition('sending', 'thinking_timeout');
                }, THINKING_DELAY_MS);
              }
            }

            if (sc.outputTranscript) {
              const transcript =
                typeof sc.outputTranscript === 'string'
                  ? sc.outputTranscript
                  : sc.outputTranscript?.text || '';
              if (transcript) {
                assistantTranscriptAccRef.current += transcript;
                setAssistantTranscript(assistantTranscriptAccRef.current);
              }
            }

            if (sc.turnComplete) {
              flushModelOutput();
              const finalUser = userTranscriptAccRef.current.trim();
              const finalAssistant = assistantTranscriptAccRef.current.trim();
              if (finalUser || finalAssistant)
                onTurnCompleteRef.current?.(finalUser, finalAssistant);
              resetTurnAccumulators();
              resetMetricsForNewTurn();
              transition('listening', 'turn_complete');
            }
          }
        } catch {
          // Ignore malformed frames
        }
      };

      ws.onerror = () => {
        clearSetupTimeout();
        patchDiagnostics({ connectionStatus: 'error' });
      };

      ws.onclose = event => {
        clearSetupTimeout();
        const msg = mapWsCloseError(event.code, event.reason);
        patchDiagnostics({
          connectionStatus: 'closed',
          wsCloseCode: event.code,
          wsCloseReason: event.reason || null,
          reconnectAttempts: diagnostics.reconnectAttempts + 1,
        });

        const pendingUser = userTranscriptAccRef.current.trim();
        const pendingAssistant = assistantTranscriptAccRef.current.trim();
        if (pendingUser || pendingAssistant)
          onTurnCompleteRef.current?.(pendingUser, pendingAssistant);

        if (msg) {
          onErrorRef.current?.(msg);
          setError(msg);
          patchDiagnostics({ lastError: msg });
          transition('error', 'ws_closed_with_error');
        } else {
          transition('idle', 'ws_closed_cleanly');
        }
        cleanup();
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to start voice session.';
      onErrorRef.current?.(errMsg);
      setError(errMsg);
      patchDiagnostics({ lastError: errMsg, connectionStatus: 'error' });
      transition('error', 'start_failed');
      cleanup();
    }
  }, [
    isSupported,
    tripId,
    voice,
    state,
    diagnostics.metrics.firstAudioChunkSentMs,
    diagnostics.metrics.firstAudioFramePlayedMs,
    diagnostics.metrics.firstTokenReceivedMs,
    diagnostics.reconnectAttempts,
    cleanup,
    clearThinkingTimer,
    debugLog,
    flushModelOutput,
    handleToolCallWs,
    patchDiagnostics,
    patchMetrics,
    resetMetricsForNewTurn,
    resetTurnAccumulators,
    sendCancelSignal,
    transition,
  ]);

  const interruptPlayback = useCallback(() => {
    flushModelOutput();
    sendCancelSignal();
    modelRespondingRef.current = false;

    const partialUser = userTranscriptAccRef.current.trim();
    const partialAssistant = assistantTranscriptAccRef.current.trim();
    if (partialAssistant || partialUser) onTurnCompleteRef.current?.(partialUser, partialAssistant);

    resetTurnAccumulators();
    transition('interrupted', 'manual_interrupt');
    transition('listening', 'post_manual_interrupt');
  }, [flushModelOutput, resetTurnAccumulators, sendCancelSignal, transition]);

  const endSession = useCallback(() => {
    const pendingUser = userTranscriptAccRef.current.trim();
    const pendingAssistant = assistantTranscriptAccRef.current.trim();
    if (pendingUser || pendingAssistant) onTurnCompleteRef.current?.(pendingUser, pendingAssistant);

    resetTurnAccumulators();
    setError(null);
    transition('idle', 'user_end_session');
    cleanup();
  }, [cleanup, resetTurnAccumulators, transition]);

  return {
    state,
    error,
    userTranscript,
    assistantTranscript,
    diagnostics,
    startSession,
    endSession,
    interruptPlayback,
    sendImage,
    isSupported,
  };
}

export { uniqueId };
