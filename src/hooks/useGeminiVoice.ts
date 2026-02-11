/**
 * useGeminiVoice – Realtime voice hook for Gemini Live API
 * Direct browser-to-Google WebSocket. No backend proxy needed.
 * Manages: API key retrieval, WebSocket, mic capture,
 * scheduled audio playback queue, server-side VAD, state machine.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface UseGeminiVoiceReturn {
  voiceState: VoiceState;
  userTranscript: string;
  assistantTranscript: string;
  errorMessage: string | null;
  startVoice: () => Promise<void>;
  stopVoice: () => void;
  toggleVoice: () => void;
}

// ---------- PCM helpers ----------

function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

// Downsample from browser sample rate to 16kHz for Gemini
function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
  if (inputSampleRate === outputSampleRate) return buffer;
  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIndex = Math.round(i * ratio);
    result[i] = buffer[Math.min(srcIndex, buffer.length - 1)];
  }
  return result;
}

// ---------- Constants ----------
const CONNECT_TIMEOUT_MS = 10000;
const GEMINI_SAMPLE_RATE = 16000; // Gemini Live uses 16kHz PCM
const PLAYBACK_SAMPLE_RATE = 24000; // Gemini outputs 24kHz PCM
const GEMINI_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

const SYSTEM_INSTRUCTION = `You are Chravel AI Concierge — a world-class travel expert with encyclopedic knowledge of destinations, cuisines, activities, logistics, and cultural tips worldwide. You help travelers with recommendations, planning, and real-time travel advice. You're warm, knowledgeable, and efficient. Keep responses conversational and concise since this is a voice conversation. When giving recommendations, be specific with names and addresses when possible.`;

interface ParsedInvokeError {
  status?: number;
  code?: string;
  message: string;
}

async function parseInvokeError(error: unknown): Promise<ParsedInvokeError> {
  const fallbackMessage = error instanceof Error ? error.message : 'Failed to start voice session';
  const parsed: ParsedInvokeError = { message: fallbackMessage };

  if (!error || typeof error !== 'object') return parsed;

  const maybeError = error as { message?: string; context?: Response };
  if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
    parsed.message = maybeError.message;
  }

  const context = maybeError.context;
  if (!context) return parsed;

  parsed.status = context.status;

  try {
    const body = (await context.clone().json()) as { error?: string; message?: string };
    if (typeof body?.error === 'string' && body.error.trim()) parsed.code = body.error;
    if (typeof body?.message === 'string' && body.message.trim()) parsed.message = body.message;
  } catch {
    // Ignore non-JSON bodies
  }

  return parsed;
}

export function useGeminiVoice(
  onUserMessage?: (text: string) => void,
  onAssistantMessage?: (text: string) => void,
): UseGeminiVoiceReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const activeRef = useRef(false);
  const setupCompleteRef = useRef(false);
  const assistantTextRef = useRef('');
  const assistantDeliveredRef = useRef(false);
  const connectionAttemptRef = useRef(0);
  const shouldStreamRef = useRef(false);
  const nextPlayTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  // ---------- cleanup ----------
  const cleanup = useCallback(() => {
    connectionAttemptRef.current += 1;
    activeRef.current = false;
    setupCompleteRef.current = false;
    shouldStreamRef.current = false;

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;

    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;

    activeSourcesRef.current.forEach(s => {
      try { s.stop(); } catch { /* already stopped */ }
    });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;

    playbackCtxRef.current?.close().catch(() => {});
    playbackCtxRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // ---------- audio playback queue ----------
  const playAudioChunk = useCallback((base64Audio: string) => {
    try {
      if (!playbackCtxRef.current || playbackCtxRef.current.state === 'closed') {
        playbackCtxRef.current = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
        nextPlayTimeRef.current = 0;
      }
      const ctx = playbackCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const int16Data = base64ToInt16Array(base64Audio);
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 0x8000;
      }

      const buffer = ctx.createBuffer(1, float32Data.length, PLAYBACK_SAMPLE_RATE);
      buffer.copyToChannel(float32Data, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const startTime = Math.max(ctx.currentTime + 0.01, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + buffer.duration;

      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
        // If no more audio queued and still active, resume listening
        if (activeSourcesRef.current.length === 0 && activeRef.current) {
          setVoiceState('listening');
          shouldStreamRef.current = true;
        }
      };
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[useGeminiVoice] Playback error:', err);
      }
    }
  }, []);

  const cancelPlayback = useCallback(() => {
    activeSourcesRef.current.forEach(s => {
      try { s.stop(); } catch { /* noop */ }
    });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
  }, []);

  // ---------- Gemini server message handler ----------
  const handleServerMessage = useCallback(
    (msg: any) => {
      // Setup complete acknowledgement
      if (msg.setupComplete) {
        setupCompleteRef.current = true;
        console.log('[useGeminiVoice] Setup complete, ready for audio');
        setVoiceState('listening');
        shouldStreamRef.current = true;
        return;
      }

      // Server content (audio + text responses)
      if (msg.serverContent) {
        const serverContent = msg.serverContent;

        // Check for turn completion
        if (serverContent.turnComplete) {
          if (assistantTextRef.current && !assistantDeliveredRef.current) {
            assistantDeliveredRef.current = true;
            onAssistantMessage?.(assistantTextRef.current);
          }
          assistantTextRef.current = '';
          assistantDeliveredRef.current = false;
          setAssistantTranscript('');
          // Resume listening after turn completes (audio playback onended also does this)
          if (activeSourcesRef.current.length === 0 && activeRef.current) {
            setVoiceState('listening');
            shouldStreamRef.current = true;
          }
          return;
        }

        // Check for interruption
        if (serverContent.interrupted) {
          cancelPlayback();
          if (assistantTextRef.current && !assistantDeliveredRef.current) {
            assistantDeliveredRef.current = true;
            onAssistantMessage?.(assistantTextRef.current);
          }
          assistantTextRef.current = '';
          assistantDeliveredRef.current = false;
          setAssistantTranscript('');
          setVoiceState('listening');
          shouldStreamRef.current = true;
          return;
        }

        // Process model turn parts
        const parts = serverContent.modelTurn?.parts;
        if (parts && Array.isArray(parts)) {
          for (const part of parts) {
            // Audio data
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
              const audioData = part.inlineData.data;
              if (audioData) {
                playAudioChunk(audioData);
                setVoiceState('speaking');
                shouldStreamRef.current = false;
              }
            }
            // Text data
            if (part.text) {
              assistantTextRef.current += part.text;
              setAssistantTranscript(assistantTextRef.current);
              setVoiceState('speaking');
              shouldStreamRef.current = false;
            }
          }
        }
        return;
      }

      // Tool calls (not used currently but handle gracefully)
      if (msg.toolCall) {
        if (import.meta.env.DEV) {
          console.log('[useGeminiVoice] Tool call received (not handled):', msg.toolCall);
        }
        return;
      }

      // Session resumption updates (informational, ignore)
      if (msg.sessionResumptionUpdate) {
        return;
      }

      // GoAway - server requesting disconnect
      if (msg.goAway) {
        console.warn('[useGeminiVoice] Server sent goAway, reconnect needed:', msg.goAway);
        setErrorMessage('Voice session expired. Tap to reconnect.');
        setVoiceState('error');
        cleanup();
        return;
      }

      // Google error response - this is the critical catch-all
      if (msg.error) {
        const errMsg = msg.error?.message || msg.error?.status || JSON.stringify(msg.error);
        console.error('[useGeminiVoice] Server error:', msg.error);
        setErrorMessage(`Voice error: ${errMsg}`);
        setVoiceState('error');
        cleanup();
        return;
      }

      // Unknown message type - log it so we never fly blind
      console.warn('[useGeminiVoice] Unhandled server message:', JSON.stringify(msg).slice(0, 500));
    },
    [onAssistantMessage, playAudioChunk, cancelPlayback, cleanup],
  );

  // ---------- mic capture ----------
  const startMicCapture = useCallback((ws: WebSocket, stream: MediaStream) => {
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = e => {
      if (!activeRef.current || ws.readyState !== WebSocket.OPEN) return;
      if (!shouldStreamRef.current || !setupCompleteRef.current) return;

      const inputData = e.inputBuffer.getChannelData(0);
      // Downsample from browser rate to 16kHz for Gemini
      const downsampled = downsampleBuffer(inputData, audioCtx.sampleRate, GEMINI_SAMPLE_RATE);
      const pcm16 = float32ToInt16(downsampled);
      const base64Audio = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);

      ws.send(JSON.stringify({
        realtimeInput: {
          audio: {
            mimeType: `audio/pcm;rate=${GEMINI_SAMPLE_RATE}`,
            data: base64Audio,
          },
        },
      }));
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
  }, []);

  // ---------- start voice ----------
  const startVoice = useCallback(async () => {
    if (activeRef.current) return;
    const attemptId = connectionAttemptRef.current + 1;
    connectionAttemptRef.current = attemptId;
    const isStaleAttempt = () => attemptId !== connectionAttemptRef.current;

    setVoiceState('connecting');
    setErrorMessage(null);
    setUserTranscript('');
    setAssistantTranscript('');
    assistantTextRef.current = '';

    try {
      // 1. Get Gemini API key from edge function (auth + tier gated)
      const { data, error } = await supabase.functions.invoke('gemini-voice-session', {
        body: {},
      });

      if (isStaleAttempt()) return;

      if (error) {
        const invokeError = await parseInvokeError(error);
        if (isStaleAttempt()) return;
        if (invokeError.code === 'VOICE_NOT_INCLUDED' || invokeError.status === 403) {
          setErrorMessage('Voice is available on Frequent Chraveler and Pro plans');
          setVoiceState('error');
          return;
        }
        if (invokeError.code === 'VOICE_NOT_CONFIGURED') {
          throw new Error('Voice service is not configured yet. Please contact support.');
        }
        throw new Error(invokeError.message || 'Failed to start voice session');
      }

      if (data?.error === 'VOICE_NOT_INCLUDED') {
        setErrorMessage('Voice is available on Frequent Chraveler and Pro plans');
        setVoiceState('error');
        return;
      }

      const apiKey = data?.api_key;
      if (!apiKey) throw new Error('No API key received');

      // 2. Request mic permission
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      } catch {
        setErrorMessage('Microphone access denied. Please allow microphone in your browser settings.');
        setVoiceState('error');
        return;
      }

      if (isStaleAttempt()) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;

      // 3. Connect WebSocket directly to Gemini Live API
      const wsUrl = `${GEMINI_WS_URL}?key=${apiKey}`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      const connectTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error('[useGeminiVoice] Connection timeout — readyState:', ws.readyState);
          ws.close();
          setErrorMessage('Voice connection timed out');
          setVoiceState('error');
          cleanup();
        }
      }, CONNECT_TIMEOUT_MS);

      ws.onopen = () => {
        clearTimeout(connectTimeout);
        if (isStaleAttempt()) {
          ws.close();
          return;
        }

        console.log('[useGeminiVoice] WebSocket connected, sending setup');

        // Send setup message
        ws.send(JSON.stringify({
          setup: {
            model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
            generationConfig: {
              responseModalities: ['AUDIO', 'TEXT'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Kore',
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }],
            },
          },
        }));

        wsRef.current = ws;
        activeRef.current = true;
        // Start mic capture (audio won't stream until setupComplete)
        startMicCapture(ws, stream);
      };

      ws.onmessage = (event) => {
        try {
          const msg = typeof event.data === 'string'
            ? JSON.parse(event.data)
            : null;
          if (msg) handleServerMessage(msg);
        } catch (err) {
          console.warn('[useGeminiVoice] Failed to parse message:', err);
        }
      };

      ws.onerror = (event) => {
        clearTimeout(connectTimeout);
        console.error('[useGeminiVoice] WebSocket error:', event);
        // Always transition to error — no stale voiceState check
        setErrorMessage('Voice connection failed');
        setVoiceState('error');
        cleanup();
      };

      ws.onclose = (event) => {
        clearTimeout(connectTimeout);
        console.log('[useGeminiVoice] WebSocket closed:', event.code, event.reason);
        if (activeRef.current) {
          // Deliver any pending transcript
          if (assistantTextRef.current && !assistantDeliveredRef.current) {
            assistantDeliveredRef.current = true;
            onAssistantMessage?.(assistantTextRef.current);
          }
          activeRef.current = false;
          setVoiceState('idle');
          cleanup();
        }
      };

    } catch (err) {
      if (isStaleAttempt()) return;
      const message = err instanceof Error ? err.message : 'Failed to start voice';
      setErrorMessage(message);
      setVoiceState('error');
      cleanup();
    }
  }, [cleanup, handleServerMessage, startMicCapture, onAssistantMessage]);

  // ---------- stop voice ----------
  const stopVoice = useCallback(() => {
    if (assistantTextRef.current && !assistantDeliveredRef.current) {
      assistantDeliveredRef.current = true;
      onAssistantMessage?.(assistantTextRef.current);
    }
    cleanup();
    setVoiceState('idle');
  }, [cleanup, onAssistantMessage]);

  // ---------- toggle ----------
  const toggleVoice = useCallback(() => {
    if (voiceState === 'idle' || voiceState === 'error') {
      startVoice();
    } else if (voiceState === 'speaking') {
      // Interrupt: cancel playback, resume listening
      cancelPlayback();
      setVoiceState('listening');
      shouldStreamRef.current = true;
    } else {
      stopVoice();
    }
  }, [voiceState, startVoice, stopVoice, cancelPlayback]);

  return {
    voiceState,
    userTranscript,
    assistantTranscript,
    errorMessage,
    startVoice,
    stopVoice,
    toggleVoice,
  };
}
