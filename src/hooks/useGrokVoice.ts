/**
 * useGrokVoice – Realtime voice hook for xAI Grok Voice Agent API
 * Manages: API key retrieval, WebSocket (subprotocol auth), mic capture,
 * scheduled audio playback queue, VAD-driven turn-taking, state machine.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface UseGrokVoiceReturn {
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

// ---------- Constants ----------
const CONNECT_TIMEOUT_MS = 8000;
const SAMPLE_RATE = 24000;
const REALTIME_WS_URL = 'wss://api.x.ai/v1/realtime';

interface ParsedInvokeError {
  status?: number;
  code?: string;
  message: string;
}

async function parseInvokeError(error: unknown): Promise<ParsedInvokeError> {
  const fallbackMessage = error instanceof Error ? error.message : 'Failed to start voice session';
  const parsed: ParsedInvokeError = { message: fallbackMessage };

  if (!error || typeof error !== 'object') {
    return parsed;
  }

  const maybeError = error as { message?: string; context?: Response };
  if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
    parsed.message = maybeError.message;
  }

  const context = maybeError.context;
  if (!context) {
    return parsed;
  }

  parsed.status = context.status;

  try {
    const body = (await context.clone().json()) as { error?: string; message?: string };
    if (typeof body?.error === 'string' && body.error.trim()) {
      parsed.code = body.error;
    }
    if (typeof body?.message === 'string' && body.message.trim()) {
      parsed.message = body.message;
    }
  } catch {
    // Ignore non-JSON function error bodies.
  }

  return parsed;
}

function openRealtimeSocket(
  url: string,
  protocols: string[],
  timeoutMs: number,
  onSocketCreated?: (socket: WebSocket) => void,
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const ws = new WebSocket(url, protocols);
    onSocketCreated?.(ws);
    ws.binaryType = 'arraybuffer';

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {
        // no-op
      }
      reject(new Error('Voice connection timed out'));
    }, timeoutMs);

    const finalize = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };

    ws.onopen = () => finalize(() => resolve(ws));
    ws.onerror = () =>
      finalize(() => {
        try {
          ws.close();
        } catch {
          // no-op
        }
        reject(new Error('Voice connection handshake failed'));
      });
    ws.onclose = event =>
      finalize(() => reject(new Error(`Voice connection closed before ready (${event.code})`)));
  });
}

export function useGrokVoice(
  onUserMessage?: (text: string) => void,
  onAssistantMessage?: (text: string) => void,
): UseGrokVoiceReturn {
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
  const openedRef = useRef(false); // tracks if WS ever opened
  const assistantTextRef = useRef('');
  const assistantDeliveredRef = useRef(false);
  const connectionAttemptRef = useRef(0); // invalidates in-flight startVoice attempts
  const pendingSocketRef = useRef<WebSocket | null>(null); // handshake socket before wsRef assignment
  const shouldStreamRef = useRef(false); // gate mic streaming
  const nextPlayTimeRef = useRef(0); // audio queue scheduler
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]); // for interrupt

  // ---------- cleanup ----------
  const cleanup = useCallback(() => {
    connectionAttemptRef.current += 1;
    activeRef.current = false;
    openedRef.current = false;
    shouldStreamRef.current = false;

    // Stop mic
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;

    // Close WS
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;

    // Cancel pending handshake socket (connecting state)
    if (pendingSocketRef.current && pendingSocketRef.current.readyState <= WebSocket.OPEN) {
      pendingSocketRef.current.close();
    }
    pendingSocketRef.current = null;

    // Stop all playing audio sources
    activeSourcesRef.current.forEach(s => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;

    // Close playback ctx
    playbackCtxRef.current?.close().catch(() => {});
    playbackCtxRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // ---------- audio playback queue ----------
  const playAudioChunk = useCallback((base64Audio: string) => {
    try {
      if (!playbackCtxRef.current || playbackCtxRef.current.state === 'closed') {
        playbackCtxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
        nextPlayTimeRef.current = 0;
      }
      const ctx = playbackCtxRef.current;

      // Resume if suspended (iOS requires user gesture)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const int16Data = base64ToInt16Array(base64Audio);
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 0x8000;
      }

      const buffer = ctx.createBuffer(1, float32Data.length, SAMPLE_RATE);
      buffer.copyToChannel(float32Data, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      // Schedule with queue to avoid jitter
      const startTime = Math.max(ctx.currentTime + 0.01, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + buffer.duration;

      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      };
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[useGrokVoice] Playback error:', err);
      }
    }
  }, []);

  const cancelPlayback = useCallback(() => {
    activeSourcesRef.current.forEach(s => {
      try {
        s.stop();
      } catch {
        /* noop */
      }
    });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
  }, []);

  // ---------- server event handler ----------
  const handleServerEvent = useCallback(
    (msg: any) => {
      const type: string = msg.type || '';

      // Normalize xAI / OpenAI event name variants
      if (type === 'input_audio_buffer.speech_started') {
        setVoiceState('listening');
        return;
      }

      if (type === 'input_audio_buffer.speech_stopped') {
        setVoiceState('thinking');
        shouldStreamRef.current = false;
        assistantTextRef.current = '';
        assistantDeliveredRef.current = false;
        setAssistantTranscript('');
        // VAD-driven: auto-commit + request response
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
          ws.send(
            JSON.stringify({
              type: 'response.create',
              response: { modalities: ['text', 'audio'] },
            }),
          );
        }
        return;
      }

      if (type === 'conversation.item.input_audio_transcription.completed') {
        if (msg.transcript) {
          setUserTranscript(msg.transcript);
          onUserMessage?.(msg.transcript);
        }
        return;
      }

      // Assistant transcript delta (both naming conventions)
      if (
        type === 'response.audio_transcript.delta' ||
        type === 'response.output_audio_transcript.delta'
      ) {
        if (msg.delta) {
          assistantTextRef.current += msg.delta;
          setAssistantTranscript(assistantTextRef.current);
          setVoiceState('speaking');
          // Pause mic during speaking
          shouldStreamRef.current = false;
        }
        return;
      }

      // Assistant audio delta (both naming conventions)
      if (type === 'response.audio.delta' || type === 'response.output_audio.delta') {
        if (msg.delta) {
          playAudioChunk(msg.delta);
          setVoiceState('speaking');
          shouldStreamRef.current = false;
        }
        return;
      }

      if (
        type === 'response.audio_transcript.done' ||
        type === 'response.output_audio_transcript.done'
      ) {
        if (assistantTextRef.current && !assistantDeliveredRef.current) {
          assistantDeliveredRef.current = true;
          onAssistantMessage?.(assistantTextRef.current);
        }
        return;
      }

      if (type === 'response.done') {
        if (assistantTextRef.current && !assistantDeliveredRef.current) {
          assistantDeliveredRef.current = true;
          onAssistantMessage?.(assistantTextRef.current);
        }
        assistantTextRef.current = '';
        assistantDeliveredRef.current = false;
        setAssistantTranscript('');
        if (activeRef.current) {
          setVoiceState('listening');
          shouldStreamRef.current = true; // resume mic
        }
        return;
      }

      if (type === 'error') {
        if (import.meta.env.DEV) {
          console.error('[useGrokVoice] Server error:', msg.error);
        }
        setErrorMessage(msg.error?.message || 'Voice error');
        shouldStreamRef.current = false;
        setVoiceState('error');
        return;
      }

      if (type === 'session.created' || type === 'session.updated') {
        if (import.meta.env.DEV) {
          console.log('[useGrokVoice] Session event:', type);
        }
        return;
      }
    },
    [onUserMessage, onAssistantMessage, playAudioChunk],
  );

  // ---------- mic capture ----------
  const startMicCapture = useCallback((ws: WebSocket, stream: MediaStream) => {
    const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = e => {
      if (!activeRef.current || ws.readyState !== WebSocket.OPEN) return;
      // Only stream mic data when we should (not during playback)
      if (!shouldStreamRef.current) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = float32ToInt16(inputData);
      const base64Audio = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);
      ws.send(
        JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64Audio,
        }),
      );
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
  }, []);

  // ---------- start voice ----------
  const startVoice = useCallback(async () => {
    if (activeRef.current || voiceState === 'connecting') return;
    const attemptId = connectionAttemptRef.current + 1;
    connectionAttemptRef.current = attemptId;
    const isStaleAttempt = () => attemptId !== connectionAttemptRef.current;

    setVoiceState('connecting');
    setErrorMessage(null);
    setUserTranscript('');
    setAssistantTranscript('');
    assistantTextRef.current = '';

    try {
      // 1. Get API key from edge function (auth + tier gated)
      const { data, error } = await supabase.functions.invoke('xai-voice-session', {
        body: {},
      });

      if (isStaleAttempt()) {
        return;
      }

      if (error) {
        const invokeError = await parseInvokeError(error);
        if (isStaleAttempt()) {
          return;
        }
        if (invokeError.code === 'VOICE_NOT_INCLUDED' || invokeError.status === 403) {
          setErrorMessage('Voice is available on Frequent Chraveler and Pro plans');
          setVoiceState('error');
          return;
        }

        if (invokeError.code === 'XAI_NOT_CONFIGURED') {
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
      if (!apiKey) {
        throw new Error('No API key received');
      }

      // 2. Request mic permission
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: SAMPLE_RATE,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      } catch {
        setErrorMessage(
          'Microphone access denied. Please allow microphone in your browser settings.',
        );
        setVoiceState('error');
        return;
      }

      if (isStaleAttempt()) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;

      // 3. Connect WebSocket with direct API key auth via subprotocol
      let ws: WebSocket;
      try {
        ws = await openRealtimeSocket(
          REALTIME_WS_URL,
          ['realtime', `openai-insecure-api-key.${apiKey}`],
          CONNECT_TIMEOUT_MS,
          socket => {
            pendingSocketRef.current = socket;
          },
        );
        pendingSocketRef.current = null;
        if (isStaleAttempt()) {
          ws.close();
          return;
        }
        if (import.meta.env.DEV) {
          console.log('[useGrokVoice] WebSocket connected');
        }
      } catch (connectError) {
        pendingSocketRef.current = null;
        if (isStaleAttempt()) return;
        throw connectError instanceof Error
          ? connectError
          : new Error('Unable to connect to voice service');
      }

      openedRef.current = true;
      activeRef.current = true;
      assistantDeliveredRef.current = false;

      ws.onmessage = event => {
        if (isStaleAttempt()) return;
        if (typeof event.data !== 'string') return;
        try {
          const msg = JSON.parse(event.data);
          handleServerEvent(msg);
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        if (isStaleAttempt()) return;
        setErrorMessage('Voice connection failed. Please try again.');
        setVoiceState('error');
        cleanup();
      };

      ws.onclose = event => {
        if (isStaleAttempt()) return;
        if (import.meta.env.DEV) {
          console.log('[useGrokVoice] WS closed:', event.code, event.reason);
        }
        if (activeRef.current) {
          setVoiceState('idle');
        }
        activeRef.current = false;
        openedRef.current = false;
      };

      if (isStaleAttempt()) {
        ws.close();
        return;
      }

      // Send session.update matching xAI Voice Agent API docs exactly
      ws.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            voice: 'Rex',
            instructions:
              'You are Chravel AI Concierge, a world-class travel expert. Be concise, travel-smart, and action-oriented. Prefer actionable answers and bullets. Keep responses under 30 seconds of speech. Answer travel-related questions with enthusiasm.',
            turn_detection: { type: 'server_vad' },
            input_audio_transcription: { model: 'grok-3-mini' },
            audio: {
              input: { format: { type: 'audio/pcm', rate: SAMPLE_RATE } },
              output: { format: { type: 'audio/pcm', rate: SAMPLE_RATE } },
            },
          },
        }),
      );

      // Start mic capture
      shouldStreamRef.current = true;
      startMicCapture(ws, stream);
      setVoiceState('listening');

      wsRef.current = ws;
    } catch (err: unknown) {
      if (isStaleAttempt()) {
        return;
      }
      if (import.meta.env.DEV) {
        console.error('[useGrokVoice] Start error:', err);
      }
      const message = err instanceof Error ? err.message : 'Failed to start voice';
      setErrorMessage(message);
      setVoiceState('error');
      cleanup();
    }
  }, [cleanup, startMicCapture, handleServerEvent, voiceState]);

  // ---------- stop voice ----------
  const stopVoice = useCallback(() => {
    cancelPlayback();
    cleanup();
    setVoiceState('idle');
    setUserTranscript('');
    setAssistantTranscript('');
    setErrorMessage(null);
    assistantTextRef.current = '';
    assistantDeliveredRef.current = false;
  }, [cleanup, cancelPlayback]);

  // ---------- toggle ----------
  const toggleVoice = useCallback(() => {
    if (voiceState === 'idle' || voiceState === 'error') {
      startVoice();
    } else if (voiceState === 'listening') {
      // Manual commit + request (backup for VAD)
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        shouldStreamRef.current = false;
        assistantTextRef.current = '';
        assistantDeliveredRef.current = false;
        setAssistantTranscript('');
        ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
        ws.send(
          JSON.stringify({
            type: 'response.create',
            response: { modalities: ['text', 'audio'] },
          }),
        );
      }
      setVoiceState('thinking');
    } else if (voiceState === 'speaking') {
      // Interrupt: cancel current response
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'response.cancel' }));
      }
      cancelPlayback();
      assistantTextRef.current = '';
      assistantDeliveredRef.current = false;
      setAssistantTranscript('');
      shouldStreamRef.current = true;
      setVoiceState('listening');
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
