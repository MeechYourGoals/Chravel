import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type GeminiLiveState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

export interface ToolCallRequest {
  name: string;
  args: Record<string, unknown>;
  id: string;
}

interface UseGeminiLiveOptions {
  tripId: string;
  voice?: string;
  onTranscript?: (text: string) => void;
  onToolCall?: (call: ToolCallRequest) => Promise<Record<string, unknown>>;
  onTurnComplete?: () => void;
}

interface UseGeminiLiveReturn {
  state: GeminiLiveState;
  error: string | null;
  startSession: () => Promise<void>;
  endSession: () => void;
  isSupported: boolean;
}

const LIVE_INPUT_SAMPLE_RATE = 16000;

const downsampleTo16k = (input: Float32Array, inputSampleRate: number): Float32Array => {
  if (inputSampleRate <= LIVE_INPUT_SAMPLE_RATE) return input;

  const sampleRateRatio = inputSampleRate / LIVE_INPUT_SAMPLE_RATE;
  const outputLength = Math.floor(input.length / sampleRateRatio);
  const output = new Float32Array(outputLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < output.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i++) {
      accum += input[i];
      count++;
    }

    output[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return output;
};

/**
 * Maps a raw server-side error message to a user-friendly string.
 * Keeps technical details out of the UI while preserving actionability.
 */
function mapSessionError(raw: string): string {
  const lower = raw.toLowerCase();

  // "Method doesn't allow unregistered callers" = API key missing, wrong, or restricted
  if (
    lower.includes('unregistered callers') ||
    lower.includes('callers without established identity')
  ) {
    return 'Voice failed: API key missing or restricted. Ensure GEMINI_API_KEY is set in Supabase Edge Function secrets and has no HTTP referrer/IP restrictions blocking server requests.';
  }
  if (
    raw.includes('403') ||
    lower.includes('not enabled') ||
    lower.includes('not enabled for this account')
  ) {
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

/**
 * Maps a WebSocket close code to a user-friendly message.
 * Returns null for clean closes (1000, 1005) so callers know not to show an error.
 */
function mapWsCloseError(code: number, reason: string): string | null {
  // Clean close — no error to show
  if (code === 1000 || code === 1005) return null;

  if (reason) return reason;

  const MESSAGES: Record<number, string> = {
    1001: 'Voice session ended (browser navigated away).',
    1002: 'Voice connection protocol error — please try again.',
    1003: 'Voice connection received invalid data — please try again.',
    1006: 'Voice connection dropped — check your internet and try again.',
    1011: 'Voice server error — please try again.',
    1012: 'Voice server is restarting — please try again in a moment.',
    1013: 'Voice service temporarily unavailable — please try again.',
    4000: 'Voice session expired — please start a new session.',
    4001: 'Voice session not authorized — please refresh and try again.',
    4429: 'Voice rate limit reached — please wait a moment and try again.',
  };

  return MESSAGES[code] ?? `Voice disconnected unexpectedly (code ${code}).`;
}

/**
 * Hook for Gemini Live bidirectional audio via WebSocket.
 * Opens a direct client-to-Gemini WebSocket authenticated via a short-lived token
 * from the gemini-voice-session edge function.
 *
 * Error coverage:
 * - Concurrent startSession calls (isStartingRef guard)
 * - Microphone permission denied / not found / in use
 * - AudioContext creation failure or iOS suspension
 * - Edge function errors (API key missing, rate limit, auth, timeout)
 * - WebSocket setup timeout
 * - WebSocket close with non-clean code (mapped to human messages)
 * - Gemini protocol-level error messages (data.error)
 * - Audio playback on closed AudioContext
 */
export function useGeminiLive({
  tripId,
  voice = 'Puck',
  onTranscript,
  onToolCall,
  onTurnComplete,
}: UseGeminiLiveOptions): UseGeminiLiveReturn {
  const [state, setState] = useState<GeminiLiveState>('idle');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  /** Prevents a double-tap on the mic from spawning two concurrent sessions. */
  const isStartingRef = useRef(false);

  // Check browser support
  const isSupported =
    typeof window !== 'undefined' &&
    typeof WebSocket !== 'undefined' &&
    typeof AudioContext !== 'undefined' &&
    typeof navigator?.mediaDevices?.getUserMedia === 'function';

  const cleanup = useCallback(() => {
    // Always reset the starting guard so the next tap works
    isStartingRef.current = false;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current.onaudioprocess = null;
      processorNodeRef.current = null;
    }
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const playAudioChunk = useCallback((base64Audio: string) => {
    // Don't attempt playback if the context was closed (e.g. during cleanup)
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;

    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const sampleRate = 24000;
      const audioBuffer = audioContextRef.current.createBuffer(1, float32Array.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (err) {
      console.error('[GeminiLive] Audio playback error:', err);
    }
  }, []);

  const startAudioCapture = useCallback(
    (ws: WebSocket, stream: MediaStream) => {
      // Don't start capture if the context was closed or is in a bad state
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;

      try {
        const sourceNode = audioContextRef.current.createMediaStreamSource(stream);
        const processorNode = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        sourceNodeRef.current = sourceNode;
        processorNodeRef.current = processorNode;

        processorNode.onaudioprocess = event => {
          if (ws.readyState !== WebSocket.OPEN) return;

          const inputData = event.inputBuffer.getChannelData(0);
          const inputSampleRate = audioContextRef.current?.sampleRate || LIVE_INPUT_SAMPLE_RATE;
          const downsampledData = downsampleTo16k(inputData, inputSampleRate);

          const pcm16 = new Int16Array(downsampledData.length);
          for (let i = 0; i < downsampledData.length; i++) {
            const s = Math.max(-1, Math.min(1, downsampledData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          const uint8 = new Uint8Array(pcm16.buffer);
          let binary = '';
          for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          const base64 = btoa(binary);

          ws.send(
            JSON.stringify({
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: 'audio/pcm;rate=16000',
                    data: base64,
                  },
                ],
              },
            }),
          );
        };

        sourceNode.connect(processorNode);
        // ScriptProcessorNode must be connected to the destination to receive
        // audio data. The outputBuffer is not written to, so speakers are silent.
        processorNode.connect(audioContextRef.current.destination);
      } catch (err) {
        console.error('[GeminiLive] Audio capture setup failed:', err);
        setError('Failed to set up audio capture. Please try again.');
        setState('error');
        cleanup();
      }
    },
    [cleanup],
  );

  /** Handle tool calls from Gemini Live and send results back */
  const handleToolCall = useCallback(
    async (ws: WebSocket, toolCallData: any) => {
      if (!onToolCall) {
        // No handler — send empty response so Gemini can continue
        ws.send(
          JSON.stringify({
            toolResponse: {
              functionResponses: (toolCallData.functionCalls || []).map((fc: any) => ({
                id: fc.id,
                name: fc.name,
                response: { result: 'Tool execution not available' },
              })),
            },
          }),
        );
        return;
      }

      const functionCalls = toolCallData.functionCalls || [];
      const responses = await Promise.all(
        functionCalls.map(async (fc: any) => {
          try {
            const result = await onToolCall({
              id: fc.id,
              name: fc.name,
              args: fc.args || {},
            });
            return { id: fc.id, name: fc.name, response: result };
          } catch (err) {
            console.error(`[GeminiLive] Tool call ${fc.name} failed:`, err);
            return {
              id: fc.id,
              name: fc.name,
              response: { error: err instanceof Error ? err.message : 'Tool execution failed' },
            };
          }
        }),
      );

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            toolResponse: { functionResponses: responses },
          }),
        );
      }
    },
    [onToolCall],
  );

  const SESSION_TIMEOUT_MS = 15_000;
  const WEBSOCKET_SETUP_TIMEOUT_MS = 15_000;

  const startSession = useCallback(async () => {
    if (!isSupported) {
      setError('Voice is not supported in this browser. Try Chrome, Edge, or Safari.');
      setState('error');
      return;
    }

    // Guard against double-tap or re-entry while already starting / active
    if (isStartingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      console.warn('[GeminiLive] startSession called while already active — ignoring');
      return;
    }
    isStartingRef.current = true;

    try {
      setState('connecting');
      setError(null);

      // ── 1. Fetch ephemeral session token from edge function ───────────────
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
      // SECURITY: apiKey fallback REMOVED — never send raw API keys to browser WebSocket.
      // Only ephemeral access tokens (created server-side) are allowed.
      const sessionErrMsg =
        typeof (sessionData as { error?: string })?.error === 'string'
          ? (sessionData as { error: string }).error
          : sessionError?.message;

      if (sessionError || !accessToken) {
        throw new Error(mapSessionError(sessionErrMsg || 'Failed to get voice session'));
      }

      // ── 2. Request microphone with device-specific error messages ─────────
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

      // ── 3. Create audio context for playback (24 kHz matches Gemini output) ─
      try {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      } catch {
        throw new Error('Failed to initialize audio. Check your audio settings and try again.');
      }
      // iOS Safari suspends AudioContext until resumed inside a user-gesture handler.
      // startSession is always called from a tap, so resuming here is safe.
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume().catch(() => {
          console.warn('[GeminiLive] AudioContext.resume() failed — audio playback may be silent');
        });
      }

      // ── 4. Open WebSocket to Gemini Live ──────────────────────────────────
      const websocketUrl =
        typeof sessionData?.websocketUrl === 'string' && sessionData.websocketUrl.length > 0
          ? sessionData.websocketUrl
          : 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';
      // SECURITY: Only ephemeral access tokens are used — no raw key= fallback
      const wsUrl = `${websocketUrl}?access_token=${encodeURIComponent(accessToken)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Timeout if setupComplete never arrives (prevents infinite "connecting" spinner)
      let setupTimeoutId: ReturnType<typeof setTimeout> | undefined;
      const clearSetupTimeout = () => {
        if (setupTimeoutId) {
          clearTimeout(setupTimeoutId);
          setupTimeoutId = undefined;
        }
      };

      ws.onopen = () => {
        console.log('[GeminiLive] WebSocket connected');

        setupTimeoutId = setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            console.warn('[GeminiLive] Setup timeout — no setupComplete received');
            setError('Voice connection timed out. Please try again.');
            setState('error');
            cleanup();
          }
        }, WEBSOCKET_SETUP_TIMEOUT_MS);

        // When using an ephemeral access token, the session setup (model, voice,
        // system instruction, AND tools) is already baked into the token by the
        // edge function. Sending a duplicate setup message risks overriding the
        // token config and stripping tool declarations.
        // Ephemeral access tokens embed all session config (model, voice,
        // system instruction, tools). No client-side setup message needed.
        // The legacy apiKey fallback path has been removed for security.
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          // ── Server-side protocol error ──────────────────────────────────
          if (data.error) {
            clearSetupTimeout();
            const code: number | undefined = data.error?.code;
            const serverMsg = String(data.error?.message || 'Voice session error from server');
            // Map known Gemini error codes to friendly messages
            const userMsg =
              code === 429
                ? 'Voice rate limit reached — please wait a moment and try again.'
                : code === 503
                  ? 'Voice service temporarily unavailable — please try again.'
                  : mapSessionError(serverMsg);
            console.error('[GeminiLive] Server protocol error:', data.error);
            setError(userMsg);
            setState('error');
            cleanup();
            return;
          }

          // ── Setup complete — session is live ────────────────────────────
          if (data.setupComplete) {
            clearSetupTimeout();
            // Reset the guard now that the session is fully established
            isStartingRef.current = false;
            console.log('[GeminiLive] Setup complete, starting audio capture');
            setState('listening');
            startAudioCapture(ws, stream);
            return;
          }

          // ── Tool call from Gemini ───────────────────────────────────────
          if (data.toolCall) {
            console.log('[GeminiLive] Tool call received:', data.toolCall);
            handleToolCall(ws, data.toolCall);
            return;
          }

          // ── Audio / text response from model ────────────────────────────
          if (data.serverContent) {
            const parts = data.serverContent.modelTurn?.parts || [];

            for (const part of parts) {
              if (part.inlineData?.data) {
                setState('speaking');
                playAudioChunk(part.inlineData.data);
              }
              if (part.text && onTranscript) {
                onTranscript(part.text);
              }
            }

            // Turn complete — model finished responding, ready for next user input
            if (data.serverContent.turnComplete) {
              setState('listening');
              onTurnComplete?.();
            }
          }

          // ── User interrupted AI mid-response ───────────────────────────
          if (data.serverContent?.interrupted) {
            console.log('[GeminiLive] AI interrupted by user');
            setState('listening');
          }
        } catch (err) {
          console.error('[GeminiLive] Message handling error:', err);
        }
      };

      ws.onerror = event => {
        clearSetupTimeout();
        console.error('[GeminiLive] WebSocket error event:', event);
        // onclose always fires after onerror, so we let onclose set the final
        // error message rather than setting it here with incomplete information.
      };

      ws.onclose = event => {
        clearSetupTimeout();
        console.log('[GeminiLive] WebSocket closed:', event.code, event.reason);
        const msg = mapWsCloseError(event.code, event.reason);
        if (msg) {
          setError(msg);
          setState('error');
        } else {
          // Clean close (1000 / 1005) — don't clobber an error state if we're
          // already in one (e.g. onerror fired just before this)
          setState(prev => (prev === 'error' ? prev : 'idle'));
        }
        cleanup();
      };
    } catch (err) {
      console.error('[GeminiLive] Start session error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start voice session.');
      setState('error');
      cleanup();
    }
  }, [
    isSupported,
    tripId,
    voice,
    cleanup,
    playAudioChunk,
    onTranscript,
    onTurnComplete,
    startAudioCapture,
    handleToolCall,
  ]);

  const endSession = useCallback(() => {
    setState('idle');
    setError(null);
    cleanup();
  }, [cleanup]);

  return {
    state,
    error,
    startSession,
    endSession,
    isSupported,
  };
}
