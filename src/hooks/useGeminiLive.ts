import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type GeminiLiveState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

interface UseGeminiLiveOptions {
  tripId: string;
  voice?: string;
  onTranscript?: (text: string) => void;
}

interface UseGeminiLiveReturn {
  state: GeminiLiveState;
  error: string | null;
  startSession: () => Promise<void>;
  endSession: () => void;
  isSupported: boolean;
}

const LIVE_INPUT_SAMPLE_RATE = 16000;

const downsampleTo16k = (
  input: Float32Array,
  inputSampleRate: number,
): Float32Array => {
  if (inputSampleRate <= LIVE_INPUT_SAMPLE_RATE) {
    return input;
  }

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
 * Hook for Gemini Live bidirectional audio via WebSocket.
 * Opens a direct client-to-Gemini WebSocket authenticated via a short-lived token
 * from the gemini-voice-session edge function.
 */
export function useGeminiLive({
  tripId,
  voice = 'Puck',
  onTranscript,
}: UseGeminiLiveOptions): UseGeminiLiveReturn {
  const [state, setState] = useState<GeminiLiveState>('idle');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  // Check browser support
  const isSupported =
    typeof window !== 'undefined' &&
    typeof WebSocket !== 'undefined' &&
    typeof AudioContext !== 'undefined' &&
    typeof navigator?.mediaDevices?.getUserMedia === 'function';

  const cleanup = useCallback(() => {
    // Stop microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Disconnect audio worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    playbackQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const playAudioChunk = useCallback(async (base64Audio: string) => {
    if (!audioContextRef.current) return;

    try {
      // Decode base64 PCM 16-bit mono 24kHz
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM 16-bit to Float32
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      // Create and play audio buffer
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

  const startSession = useCallback(async () => {
    if (!isSupported) {
      setError('Browser does not support Gemini Live voice');
      setState('error');
      return;
    }

    try {
      setState('connecting');
      setError(null);

      // 1. Get session config from edge function
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
        'gemini-voice-session',
        { body: { tripId, voice } },
      );

      if (sessionError || !sessionData?.apiKey) {
        throw new Error(sessionError?.message || 'Failed to get voice session');
      }

      // 2. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Create audio context for playback
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      // 4. Open WebSocket to Gemini Live
      const wsUrl = `${sessionData.websocketUrl}?key=${sessionData.apiKey}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[GeminiLive] WebSocket connected');
        const rawModel = String(
          sessionData.model || 'models/gemini-2.5-flash-native-audio-preview-12-2025',
        );
        const normalizedModel = rawModel.startsWith('models/')
          ? rawModel
          : `models/${rawModel.replace(/^models\//, '')}`;

        // Send setup message
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
          },
        };

        ws.send(JSON.stringify(setupMessage));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Setup complete
          if (data.setupComplete) {
            console.log('[GeminiLive] Setup complete, starting audio capture');
            setState('listening');
            startAudioCapture(ws, stream);
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

            // Turn complete
            if (data.serverContent.turnComplete) {
              setState('listening');
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

      ws.onerror = (event) => {
        console.error('[GeminiLive] WebSocket error:', event);
        setError('Voice connection error');
        setState('error');
        cleanup();
      };

      ws.onclose = (event) => {
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
  }, [isSupported, tripId, voice, cleanup, playAudioChunk, onTranscript]);

  const startAudioCapture = useCallback((ws: WebSocket, stream: MediaStream) => {
    if (!audioContextRef.current) return;

    try {
      const sourceNode = audioContextRef.current.createMediaStreamSource(stream);

      // Use ScriptProcessorNode as fallback (AudioWorklet requires HTTPS + module)
      const processorNode = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorNode.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;

        const inputData = event.inputBuffer.getChannelData(0);
        const inputSampleRate = audioContextRef.current?.sampleRate || LIVE_INPUT_SAMPLE_RATE;
        const downsampledData = downsampleTo16k(inputData, inputSampleRate);

        // Convert to PCM 16-bit mono
        const pcm16 = new Int16Array(downsampledData.length);
        for (let i = 0; i < downsampledData.length; i++) {
          const s = Math.max(-1, Math.min(1, downsampledData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert to base64
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64 = btoa(binary);

        // Send audio to Gemini
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
    }
  }, []);

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
