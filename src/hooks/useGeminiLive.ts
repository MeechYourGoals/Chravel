import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AudioPlaybackQueue } from '@/lib/geminiLive/audioPlayback';
import { startAudioCapture, type AudioCaptureHandle } from '@/lib/geminiLive/audioCapture';

export type GeminiLiveState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

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
}

interface UseGeminiLiveReturn {
  state: GeminiLiveState;
  error: string | null;
  userTranscript: string;
  assistantTranscript: string;
  startSession: () => Promise<void>;
  endSession: () => void;
  interruptPlayback: () => void;
  isSupported: boolean;
}

const LIVE_INPUT_MIME = 'audio/pcm;rate=16000';
const SESSION_TIMEOUT_MS = 15_000;
const WEBSOCKET_SETUP_TIMEOUT_MS = 15_000;
const THINKING_DELAY_MS = 1_500;

// Safari < 14.5 exposes webkitAudioContext instead of AudioContext
const SafeAudioContext: typeof AudioContext | undefined =
  typeof window !== 'undefined'
    ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    : undefined;

let idCounter = 0;
function uniqueId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function mapSessionError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('unregistered callers') || lower.includes('callers without established identity')) {
    return 'Voice failed: API key missing or restricted. Ensure GEMINI_API_KEY is set in Supabase Edge Function secrets.';
  }
  if (raw.includes('403') || lower.includes('not enabled')) {
    return 'Voice is unavailable right now (API configuration issue). Please try again later.';
  }
  if (lower.includes('gemini_api_key') || lower.includes('api key') || lower.includes('not configured')) {
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

/**
 * Gemini Live bidirectional voice hook.
 *
 * Uses refs for all callbacks that are read inside the WebSocket handler
 * to avoid stale-closure bugs when callbacks change between renders.
 */
export function useGeminiLive({
  tripId,
  voice = 'Puck',
  onToolCall,
  onTurnComplete,
}: UseGeminiLiveOptions): UseGeminiLiveReturn {
  const [state, setState] = useState<GeminiLiveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');

  // ── Refs for WebSocket-safe callback access (avoids stale closures) ──
  const onTurnCompleteRef = useRef(onTurnComplete);
  useEffect(() => { onTurnCompleteRef.current = onTurnComplete; }, [onTurnComplete]);

  const onToolCallRef = useRef(onToolCall);
  useEffect(() => { onToolCallRef.current = onToolCall; }, [onToolCall]);

  // ── Internal refs ──
  const wsRef = useRef<WebSocket | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureHandleRef = useRef<AudioCaptureHandle | null>(null);
  const playbackQueueRef = useRef<AudioPlaybackQueue | null>(null);
  const isStartingRef = useRef(false);
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userTranscriptAccRef = useRef('');
  const assistantTranscriptAccRef = useRef('');
  const modelRespondingRef = useRef(false);
  // Track whether user has spoken at all this turn (for thinking timer logic)
  const userHasSpokenRef = useRef(false);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof WebSocket !== 'undefined' &&
    SafeAudioContext !== undefined &&
    typeof navigator?.mediaDevices?.getUserMedia === 'function';

  const clearThinkingTimer = useCallback(() => {
    if (thinkingTimerRef.current) {
      clearTimeout(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
  }, []);

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

    if (playbackCtxRef.current?.state !== 'closed') {
      playbackCtxRef.current?.close().catch(() => {});
    }
    playbackCtxRef.current = null;

    if (captureCtxRef.current?.state !== 'closed') {
      captureCtxRef.current?.close().catch(() => {});
    }
    captureCtxRef.current = null;

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  }, [clearThinkingTimer]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Close session if tripId changes (session config is immutable per connection)
  const prevTripIdRef = useRef(tripId);
  useEffect(() => {
    if (prevTripIdRef.current !== tripId && wsRef.current) {
      // Finalize any pending turn before closing
      const pendingUser = userTranscriptAccRef.current.trim();
      const pendingAssistant = assistantTranscriptAccRef.current.trim();
      if (pendingUser || pendingAssistant) {
        onTurnCompleteRef.current?.(pendingUser, pendingAssistant);
      }
      userTranscriptAccRef.current = '';
      assistantTranscriptAccRef.current = '';
      cleanup();
      setState('idle');
      setError(null);
      setUserTranscript('');
      setAssistantTranscript('');
    }
    prevTripIdRef.current = tripId;
  }, [tripId, cleanup]);

  const flushModelOutput = useCallback(() => {
    playbackQueueRef.current?.flush();
    clearThinkingTimer();
  }, [clearThinkingTimer]);

  const resetTurnAccumulators = useCallback(() => {
    userTranscriptAccRef.current = '';
    assistantTranscriptAccRef.current = '';
    modelRespondingRef.current = false;
    userHasSpokenRef.current = false;
    setUserTranscript('');
    setAssistantTranscript('');
  }, []);

  /**
   * Handle tool calls from Gemini Live (uses ref for latest callback).
   */
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

  const startSession = useCallback(async () => {
    if (!isSupported) {
      setError('Voice is not supported in this browser. Try Chrome, Edge, or Safari.');
      setState('error');
      return;
    }

    if (isStartingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    isStartingRef.current = true;

    try {
      setState('connecting');
      setError(null);
      resetTurnAccumulators();

      // 1. Fetch ephemeral token
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
        throw new Error(mapSessionError(sessionErrMsg || 'Failed to get voice session'));
      }

      // 2. Request microphone
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      } catch (mediaErr) {
        const name = mediaErr instanceof Error ? mediaErr.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          throw new Error('Microphone permission denied. Allow microphone access in your browser settings and try again.');
        }
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          throw new Error('No microphone detected. Connect a microphone and try again.');
        }
        if (name === 'NotReadableError' || name === 'TrackStartError') {
          throw new Error('Microphone is already in use by another app. Close other apps and try again.');
        }
        throw new Error('Could not access microphone. Check your audio settings and try again.');
      }
      mediaStreamRef.current = stream;

      // 3. Create AudioContexts (separate for capture and playback)
      // Uses SafeAudioContext which falls back to webkitAudioContext on older Safari
      if (!SafeAudioContext) {
        throw new Error('Audio is not supported in this browser.');
      }
      try {
        playbackCtxRef.current = new SafeAudioContext({ sampleRate: 24000 });
      } catch {
        throw new Error('Failed to initialize audio playback.');
      }
      try {
        captureCtxRef.current = new SafeAudioContext();
      } catch {
        throw new Error('Failed to initialize audio capture.');
      }

      if (playbackCtxRef.current.state === 'suspended') {
        await playbackCtxRef.current.resume().catch(() => {});
      }
      if (captureCtxRef.current.state === 'suspended') {
        await captureCtxRef.current.resume().catch(() => {});
      }

      playbackQueueRef.current = new AudioPlaybackQueue(playbackCtxRef.current);

      // 4. Open WebSocket to Gemini Live
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
        setupTimeoutId = setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            setError('Voice connection timed out. Please try again.');
            setState('error');
            cleanup();
          }
        }, WEBSOCKET_SETUP_TIMEOUT_MS);
      };

      // ── WebSocket message handler ──
      // All mutable state is accessed via refs to avoid stale closures.
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
            setError(userMsg);
            setState('error');
            cleanup();
            return;
          }

          if (data.setupComplete) {
            clearSetupTimeout();
            isStartingRef.current = false;
            setState('listening');

            if (captureCtxRef.current && mediaStreamRef.current) {
              captureHandleRef.current = startAudioCapture(
                mediaStreamRef.current,
                captureCtxRef.current,
                (base64PCM: string) => {
                  if (ws.readyState !== WebSocket.OPEN) return;
                  ws.send(
                    JSON.stringify({
                      realtimeInput: {
                        mediaChunks: [{ mimeType: LIVE_INPUT_MIME, data: base64PCM }],
                      },
                    }),
                  );
                },
              );
            }
            // No thinking timer here — it only starts after user speaks
            return;
          }

          if (data.toolCall) {
            void handleToolCallWs(ws, data.toolCall);
            return;
          }

          if (data.serverContent) {
            const sc = data.serverContent;

            if (sc.interrupted) {
              playbackQueueRef.current?.flush();
              clearThinkingTimer();
              modelRespondingRef.current = false;

              const partialUser = userTranscriptAccRef.current.trim();
              const partialAssistant = assistantTranscriptAccRef.current.trim();
              if (partialUser || partialAssistant) {
                onTurnCompleteRef.current?.(partialUser, partialAssistant);
              }

              userTranscriptAccRef.current = '';
              assistantTranscriptAccRef.current = '';
              userHasSpokenRef.current = false;
              setUserTranscript('');
              setAssistantTranscript('');
              setState('listening');
              return;
            }

            const parts = sc.modelTurn?.parts || [];
            if (parts.length > 0 && !modelRespondingRef.current) {
              clearThinkingTimer();
              modelRespondingRef.current = true;
            }

            for (const part of parts) {
              if (part.inlineData?.data) {
                setState('speaking');
                playbackQueueRef.current?.enqueue(part.inlineData.data);
              }
              if (typeof part.text === 'string' && part.text.length > 0) {
                setState(prev => (prev === 'listening' || prev === 'thinking' ? 'speaking' : prev));
                assistantTranscriptAccRef.current += part.text;
                setAssistantTranscript(assistantTranscriptAccRef.current);
              }
            }

            if (sc.inputTranscript) {
              clearThinkingTimer();
              const transcript = typeof sc.inputTranscript === 'string'
                ? sc.inputTranscript
                : sc.inputTranscript?.text || '';
              if (transcript) {
                userHasSpokenRef.current = true;
                userTranscriptAccRef.current = transcript;
                setUserTranscript(transcript);
                setState('listening');

                // Restart thinking timer now that user has spoken
                thinkingTimerRef.current = setTimeout(() => {
                  setState(prev => (prev === 'listening' ? 'thinking' : prev));
                }, THINKING_DELAY_MS);
              }
            }

            if (sc.outputTranscript) {
              const transcript = typeof sc.outputTranscript === 'string'
                ? sc.outputTranscript
                : sc.outputTranscript?.text || '';
              if (transcript) {
                assistantTranscriptAccRef.current += transcript;
                setAssistantTranscript(assistantTranscriptAccRef.current);
              }
            }

            if (sc.turnComplete) {
              playbackQueueRef.current?.flush();
              clearThinkingTimer();

              const finalUser = userTranscriptAccRef.current.trim();
              const finalAssistant = assistantTranscriptAccRef.current.trim();
              if (finalUser || finalAssistant) {
                onTurnCompleteRef.current?.(finalUser, finalAssistant);
              }

              userTranscriptAccRef.current = '';
              assistantTranscriptAccRef.current = '';
              modelRespondingRef.current = false;
              userHasSpokenRef.current = false;
              setUserTranscript('');
              setAssistantTranscript('');
              setState('listening');
            }
          }
        } catch {
          // Malformed message — skip
        }
      };

      ws.onerror = () => {
        clearSetupTimeout();
      };

      ws.onclose = event => {
        clearSetupTimeout();
        const msg = mapWsCloseError(event.code, event.reason);

        const pendingUser = userTranscriptAccRef.current.trim();
        const pendingAssistant = assistantTranscriptAccRef.current.trim();
        if (pendingUser || pendingAssistant) {
          onTurnCompleteRef.current?.(pendingUser, pendingAssistant);
        }

        if (msg) {
          setError(msg);
          setState('error');
        } else {
          setState(prev => (prev === 'error' ? prev : 'idle'));
        }
        cleanup();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start voice session.');
      setState('error');
      cleanup();
    }
  }, [isSupported, tripId, voice, cleanup, handleToolCallWs, clearThinkingTimer, resetTurnAccumulators]);

  const interruptPlayback = useCallback(() => {
    flushModelOutput();
    modelRespondingRef.current = false;

    const partialUser = userTranscriptAccRef.current.trim();
    const partialAssistant = assistantTranscriptAccRef.current.trim();
    if (partialAssistant || partialUser) {
      onTurnCompleteRef.current?.(partialUser, partialAssistant);
    }

    userTranscriptAccRef.current = '';
    assistantTranscriptAccRef.current = '';
    userHasSpokenRef.current = false;
    setUserTranscript('');
    setAssistantTranscript('');
    setState('listening');
  }, [flushModelOutput]);

  const endSession = useCallback(() => {
    const pendingUser = userTranscriptAccRef.current.trim();
    const pendingAssistant = assistantTranscriptAccRef.current.trim();
    if (pendingUser || pendingAssistant) {
      onTurnCompleteRef.current?.(pendingUser, pendingAssistant);
    }

    resetTurnAccumulators();
    setState('idle');
    setError(null);
    cleanup();
  }, [cleanup, resetTurnAccumulators]);

  return {
    state,
    error,
    userTranscript,
    assistantTranscript,
    startSession,
    endSession,
    interruptPlayback,
    isSupported,
  };
}

export { uniqueId };
