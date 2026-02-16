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
  isDemoMode?: boolean;
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
const SESSION_FETCH_TIMEOUT_MS = 15_000;
const WEBSOCKET_SETUP_TIMEOUT_MS = 15_000;
const GET_USER_MEDIA_TIMEOUT_MS = 10_000;

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

/** Extract HTTP status from Supabase FunctionsHttpError (context may be Response) */
function getHttpStatus(err: unknown): number | undefined {
  const ctx = (err as { context?: { status?: number } })?.context;
  return typeof ctx?.status === 'number' ? ctx.status : undefined;
}

/** Map session fetch errors to user-friendly messages (401/403 vs generic) */
function getSessionErrorMessage(err: unknown, fallback: string): string {
  const status = getHttpStatus(err);
  if (status === 401) return 'Please sign in to use voice';
  if (status === 403) return 'Voice requires Pro subscription';
  return err instanceof Error ? err.message : fallback;
}

/**
 * Hook for Gemini Live bidirectional audio via WebSocket.
 * Opens a direct client-to-Gemini WebSocket authenticated via a short-lived token
 * from the gemini-voice-session edge function.
 */
export function useGeminiLive({
  tripId,
  voice = 'Puck',
  isDemoMode = false,
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

  // Check browser support
  const isSupported =
    typeof window !== 'undefined' &&
    typeof WebSocket !== 'undefined' &&
    typeof AudioContext !== 'undefined' &&
    typeof navigator?.mediaDevices?.getUserMedia === 'function';

  const cleanup = useCallback(() => {
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
    if (!audioContextRef.current) return;

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
      if (!audioContextRef.current) return;

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
        processorNode.connect(audioContextRef.current.destination);
      } catch (err) {
        console.error('[GeminiLive] Audio capture setup failed:', err);
        setError('Failed to capture audio');
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

  const startSession = useCallback(async () => {
    if (!isSupported) {
      setError('Browser does not support Gemini Live voice');
      setState('error');
      return;
    }

    try {
      setState('connecting');
      setError(null);

      // 1. Get session config from edge function (with hard timeout to prevent infinite spinner)
      const sessionFetchPromise = supabase.functions.invoke('gemini-voice-session', {
        body: { tripId, voice, isDemoMode },
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Voice session timed out. Please try again.')),
          SESSION_FETCH_TIMEOUT_MS,
        );
      });
      const { data: sessionData, error: sessionError } = await Promise.race([
        sessionFetchPromise,
        timeoutPromise,
      ]);

      const accessToken =
        typeof sessionData?.accessToken === 'string' ? sessionData.accessToken : null;
      const apiKey = typeof sessionData?.apiKey === 'string' ? sessionData.apiKey : null;
      if (sessionError || (!accessToken && !apiKey)) {
        const msg = getSessionErrorMessage(sessionError, 'Failed to get voice session');
        throw new Error(msg);
      }

      // 2. Request microphone access (with timeout)
      const getUserMediaPromise = navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const getUserMediaTimeout = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Microphone access timed out')),
          GET_USER_MEDIA_TIMEOUT_MS,
        );
      });
      const stream = await Promise.race([getUserMediaPromise, getUserMediaTimeout]);
      mediaStreamRef.current = stream;

      // 3. Create audio context for playback
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      // 4. Open WebSocket to Gemini Live
      const websocketUrl =
        typeof sessionData?.websocketUrl === 'string' && sessionData.websocketUrl.length > 0
          ? sessionData.websocketUrl
          : 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';
      const wsUrl = accessToken
        ? `${websocketUrl}?access_token=${encodeURIComponent(accessToken)}`
        : `${websocketUrl}?key=${encodeURIComponent(apiKey as string)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      let setupCompleteReceived = false;
      const setupTimeoutId = setTimeout(() => {
        if (setupCompleteReceived) return;
        console.error('[GeminiLive] WebSocket setup timed out');
        setError('Voice connection timed out');
        setState('error');
        cleanup();
      }, WEBSOCKET_SETUP_TIMEOUT_MS);

      ws.onopen = () => {
        console.log('[GeminiLive] WebSocket connected');

        // When using an ephemeral access token, the session setup (model, voice,
        // system instruction, AND tools) is already baked into the token by the
        // edge function. Sending a duplicate setup message risks overriding the
        // token config and stripping tool declarations.
        // Only send a client-side setup when using an API key directly (fallback).
        if (!accessToken) {
          const rawModel = String(
            sessionData.model || 'models/gemini-2.5-flash-native-audio-preview-12-2025',
          );
          const normalizedModel = rawModel.startsWith('models/')
            ? rawModel
            : `models/${rawModel.replace(/^models\//, '')}`;

          const setupMessage = {
            setup: {
              model: normalizedModel,
              generationConfig: {
                responseModalities: ['AUDIO', 'TEXT'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: sessionData.voice,
                    },
                  },
                },
              },
              systemInstruction: {
                parts: [{ text: sessionData.systemInstruction }],
              },
              tools: sessionData.tools ?? [],
            },
          };

          ws.send(JSON.stringify(setupMessage));
        }
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          // Setup complete
          if (data.setupComplete) {
            setupCompleteReceived = true;
            clearTimeout(setupTimeoutId);
            console.log('[GeminiLive] Setup complete, starting audio capture');
            setState('listening');
            startAudioCapture(ws, stream);
            return;
          }

          // Tool call from Gemini
          if (data.toolCall) {
            console.log('[GeminiLive] Tool call received:', data.toolCall);
            handleToolCall(ws, data.toolCall);
            return;
          }

          // Server content (audio response)
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

          // Interruption
          if (data.serverContent?.interrupted) {
            console.log('[GeminiLive] AI interrupted by user');
            setState('listening');
          }
        } catch (err) {
          console.error('[GeminiLive] Message parse error:', err);
        }
      };

      ws.onerror = () => {
        clearTimeout(setupTimeoutId);
        console.error('[GeminiLive] WebSocket error');
        setError('Voice connection error');
        setState('error');
        cleanup();
      };

      ws.onclose = event => {
        clearTimeout(setupTimeoutId);
        console.log('[GeminiLive] WebSocket closed:', event.code, event.reason);
        if (event.code !== 1000 && event.code !== 1005) {
          setError(event.reason || 'Voice session disconnected');
          setState('error');
        } else {
          setState(prev => (prev === 'error' ? prev : 'idle'));
        }
        cleanup();
      };
    } catch (err) {
      console.error('[GeminiLive] Start session error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start voice session');
      setState('error');
      cleanup();
    }
  }, [
    isSupported,
    tripId,
    voice,
    isDemoMode,
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
