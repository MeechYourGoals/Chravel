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
  /** Flush playback and return to listening without closing the session (barge-in). */
  interruptPlayback: () => void;
  isSupported: boolean;
}

const LIVE_INPUT_MIME = 'audio/pcm;rate=16000';
const SESSION_TIMEOUT_MS = 15_000;
const WEBSOCKET_SETUP_TIMEOUT_MS = 15_000;
const THINKING_DELAY_MS = 1_500;

/**
 * Maps server-side error messages to user-friendly strings.
 */
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

/**
 * Maps a WebSocket close code to a user-friendly message.
 * Returns null for clean closes so callers know not to show an error.
 */
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
 * Opens a direct client-to-Gemini WebSocket authenticated via a short-lived
 * ephemeral token from the gemini-voice-session edge function. Handles:
 * - Mic capture → PCM16 16kHz → WebSocket
 * - Scheduled audio playback queue (gap-free)
 * - Barge-in interruption (flush playback + resume listening)
 * - Partial user transcript tracking
 * - Streaming assistant transcript accumulation
 * - Turn completion + persistence callbacks
 * - Tool call handling
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

  const wsRef = useRef<WebSocket | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureHandleRef = useRef<AudioCaptureHandle | null>(null);
  const playbackQueueRef = useRef<AudioPlaybackQueue | null>(null);
  const isStartingRef = useRef(false);
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Accumulate transcript text across events within a turn
  const userTranscriptAccRef = useRef('');
  const assistantTranscriptAccRef = useRef('');
  // Track whether model has started responding (for thinking→speaking transition)
  const modelRespondingRef = useRef(false);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof WebSocket !== 'undefined' &&
    typeof AudioContext !== 'undefined' &&
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

  /**
   * Flush playback and caches for barge-in or turn end.
   */
  const flushModelOutput = useCallback(() => {
    playbackQueueRef.current?.flush();
    clearThinkingTimer();
  }, [clearThinkingTimer]);

  /**
   * Finalize a complete turn: persist and reset accumulators.
   */
  const finalizeTurn = useCallback(() => {
    clearThinkingTimer();
    modelRespondingRef.current = false;

    const finalUserText = userTranscriptAccRef.current.trim();
    const finalAssistantText = assistantTranscriptAccRef.current.trim();

    if (finalUserText || finalAssistantText) {
      onTurnComplete?.(finalUserText, finalAssistantText);
    }

    // Reset accumulators for next turn
    userTranscriptAccRef.current = '';
    assistantTranscriptAccRef.current = '';
    setUserTranscript('');
    setAssistantTranscript('');
  }, [onTurnComplete, clearThinkingTimer]);

  /**
   * Handle tool calls from Gemini Live and return results via WebSocket.
   */
  const handleToolCall = useCallback(
    async (ws: WebSocket, toolCallData: Record<string, unknown>) => {
      const functionCalls = (toolCallData.functionCalls || []) as Array<{
        id: string;
        name: string;
        args?: Record<string, unknown>;
      }>;

      if (!onToolCall) {
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
            const result = await onToolCall({ id: fc.id, name: fc.name, args: fc.args || {} });
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
    [onToolCall],
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
      setUserTranscript('');
      setAssistantTranscript('');
      userTranscriptAccRef.current = '';
      assistantTranscriptAccRef.current = '';
      modelRespondingRef.current = false;

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

      // 3. Create AudioContexts
      // Separate contexts for capture (native rate) and playback (24 kHz)
      try {
        playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });
      } catch {
        throw new Error('Failed to initialize audio playback.');
      }
      try {
        captureCtxRef.current = new AudioContext();
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
        if (setupTimeoutId) {
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

        // Ephemeral tokens embed session config; no setup message needed.
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          // Protocol error from server
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

          // Setup complete — session is live
          if (data.setupComplete) {
            clearSetupTimeout();
            isStartingRef.current = false;
            setState('listening');

            // Start mic capture
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

            // Start thinking timer: if user has been silent for a while, show thinking
            thinkingTimerRef.current = setTimeout(() => {
              setState(prev => (prev === 'listening' ? 'thinking' : prev));
            }, THINKING_DELAY_MS);

            return;
          }

          // Tool call from Gemini
          if (data.toolCall) {
            void handleToolCall(ws, data.toolCall);
            return;
          }

          // Server content (audio, text, turn signals)
          if (data.serverContent) {
            const sc = data.serverContent;

            // Interrupted — barge-in from user
            if (sc.interrupted) {
              flushModelOutput();
              modelRespondingRef.current = false;

              // Finalize whatever we have so far
              const partialAssistant = assistantTranscriptAccRef.current.trim();
              if (partialAssistant) {
                onTurnComplete?.(userTranscriptAccRef.current.trim(), partialAssistant);
              }

              // Reset for next turn
              userTranscriptAccRef.current = '';
              assistantTranscriptAccRef.current = '';
              setUserTranscript('');
              setAssistantTranscript('');

              setState('listening');

              // Restart thinking timer for new silence detection
              thinkingTimerRef.current = setTimeout(() => {
                setState(prev => (prev === 'listening' ? 'thinking' : prev));
              }, THINKING_DELAY_MS);
              return;
            }

            // Model turn parts (audio + text from the model)
            const parts = sc.modelTurn?.parts || [];
            if (parts.length > 0) {
              clearThinkingTimer();
              modelRespondingRef.current = true;
            }

            for (const part of parts) {
              // Audio from model
              if (part.inlineData?.data) {
                setState('speaking');
                playbackQueueRef.current?.enqueue(part.inlineData.data);
              }

              // Text from model
              if (typeof part.text === 'string' && part.text.length > 0) {
                if (!modelRespondingRef.current) {
                  modelRespondingRef.current = true;
                  clearThinkingTimer();
                }
                setState(prev => (prev === 'listening' || prev === 'thinking' ? 'speaking' : prev));
                assistantTranscriptAccRef.current += part.text;
                setAssistantTranscript(assistantTranscriptAccRef.current);
              }
            }

            // Input transcript (user's speech recognized by server)
            if (sc.inputTranscript) {
              clearThinkingTimer();
              const transcript = typeof sc.inputTranscript === 'string'
                ? sc.inputTranscript
                : sc.inputTranscript?.text || '';
              if (transcript) {
                userTranscriptAccRef.current = transcript;
                setUserTranscript(transcript);
                setState('listening');

                // Reset thinking timer since user is speaking
                thinkingTimerRef.current = setTimeout(() => {
                  setState(prev => (prev === 'listening' ? 'thinking' : prev));
                }, THINKING_DELAY_MS);
              }
            }

            // Output transcript (server-side transcription of model audio)
            if (sc.outputTranscript) {
              const transcript = typeof sc.outputTranscript === 'string'
                ? sc.outputTranscript
                : sc.outputTranscript?.text || '';
              if (transcript) {
                assistantTranscriptAccRef.current += transcript;
                setAssistantTranscript(assistantTranscriptAccRef.current);
              }
            }

            // Turn complete — model finished responding
            if (sc.turnComplete) {
              flushModelOutput();
              finalizeTurn();
              setState('listening');

              // Restart thinking timer
              thinkingTimerRef.current = setTimeout(() => {
                setState(prev => (prev === 'listening' ? 'thinking' : prev));
              }, THINKING_DELAY_MS);
            }
          }
        } catch {
          // Malformed message — skip
        }
      };

      ws.onerror = () => {
        clearSetupTimeout();
        // onclose always fires after onerror; let onclose set final state
      };

      ws.onclose = event => {
        clearSetupTimeout();
        const msg = mapWsCloseError(event.code, event.reason);

        // Finalize any in-progress turn before cleanup
        const pendingUser = userTranscriptAccRef.current.trim();
        const pendingAssistant = assistantTranscriptAccRef.current.trim();
        if (pendingUser || pendingAssistant) {
          onTurnComplete?.(pendingUser, pendingAssistant);
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
  }, [
    isSupported,
    tripId,
    voice,
    cleanup,
    flushModelOutput,
    finalizeTurn,
    handleToolCall,
    clearThinkingTimer,
    onTurnComplete,
  ]);

  /**
   * Flush playback and return to listening without closing the WebSocket.
   * Used for manual barge-in (user taps mic while model is speaking).
   * The mic capture continues, so the user can start speaking immediately.
   * The server's VAD will detect user speech and handle the server-side interrupt.
   */
  const interruptPlayback = useCallback(() => {
    flushModelOutput();
    modelRespondingRef.current = false;

    // Finalize the current assistant output with whatever text we have
    const partialAssistant = assistantTranscriptAccRef.current.trim();
    if (partialAssistant || userTranscriptAccRef.current.trim()) {
      onTurnComplete?.(userTranscriptAccRef.current.trim(), partialAssistant);
    }

    // Reset for next turn
    userTranscriptAccRef.current = '';
    assistantTranscriptAccRef.current = '';
    setUserTranscript('');
    setAssistantTranscript('');
    setState('listening');

    // Restart thinking timer
    clearThinkingTimer();
    thinkingTimerRef.current = setTimeout(() => {
      setState(prev => (prev === 'listening' ? 'thinking' : prev));
    }, THINKING_DELAY_MS);
  }, [flushModelOutput, onTurnComplete, clearThinkingTimer]);

  const endSession = useCallback(() => {
    // Finalize any pending turn
    const pendingUser = userTranscriptAccRef.current.trim();
    const pendingAssistant = assistantTranscriptAccRef.current.trim();
    if (pendingUser || pendingAssistant) {
      onTurnComplete?.(pendingUser, pendingAssistant);
    }

    userTranscriptAccRef.current = '';
    assistantTranscriptAccRef.current = '';
    setUserTranscript('');
    setAssistantTranscript('');
    setState('idle');
    setError(null);
    cleanup();
  }, [cleanup, onTurnComplete]);

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
