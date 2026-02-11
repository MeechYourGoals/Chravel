/**
 * useGrokVoice – Realtime voice hook for xAI Grok Voice Agent API
 * Manages: ephemeral token, WebSocket (subprotocol auth), mic capture,
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
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldStreamRef = useRef(false); // gate mic streaming
  const nextPlayTimeRef = useRef(0); // audio queue scheduler
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]); // for interrupt

  // ---------- cleanup ----------
  const cleanup = useCallback(() => {
    activeRef.current = false;
    openedRef.current = false;
    shouldStreamRef.current = false;

    if (connectTimerRef.current) {
      clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }

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

    // Stop all playing audio sources
    activeSourcesRef.current.forEach(s => {
      try { s.stop(); } catch { /* already stopped */ }
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
      try { s.stop(); } catch { /* noop */ }
    });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
  }, []);

  // ---------- server event handler ----------
  const handleServerEvent = useCallback((msg: any) => {
    const type: string = msg.type || '';

    // Normalize xAI / OpenAI event name variants
    if (type === 'input_audio_buffer.speech_started') {
      setVoiceState('listening');
      return;
    }

    if (type === 'input_audio_buffer.speech_stopped') {
      setVoiceState('thinking');
      // VAD-driven: auto-commit + request response
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
        ws.send(JSON.stringify({
          type: 'response.create',
          response: { modalities: ['text', 'audio'] },
        }));
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
    if (type === 'response.audio_transcript.delta' || type === 'response.output_audio_transcript.delta') {
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

    if (type === 'response.audio_transcript.done' || type === 'response.output_audio_transcript.done') {
      if (assistantTextRef.current) {
        onAssistantMessage?.(assistantTextRef.current);
      }
      return;
    }

    if (type === 'response.done') {
      assistantTextRef.current = '';
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
      setVoiceState('error');
      return;
    }

    if (type === 'session.created' || type === 'session.updated') {
      if (import.meta.env.DEV) {
        console.log('[useGrokVoice] Session event:', type);
      }
      return;
    }
  }, [onUserMessage, onAssistantMessage, playAudioChunk]);

  // ---------- mic capture ----------
  const startMicCapture = useCallback((ws: WebSocket, stream: MediaStream) => {
    const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (!activeRef.current || ws.readyState !== WebSocket.OPEN) return;
      // Only stream mic data when we should (not during playback)
      if (!shouldStreamRef.current) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = float32ToInt16(inputData);
      const base64Audio = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);
      ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64Audio,
      }));
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
  }, []);

  // ---------- start voice ----------
  const startVoice = useCallback(async () => {
    if (activeRef.current) return;
    setVoiceState('connecting');
    setErrorMessage(null);
    setUserTranscript('');
    setAssistantTranscript('');
    assistantTextRef.current = '';

    try {
      // 1. Get ephemeral token from edge function
      const { data, error } = await supabase.functions.invoke('xai-voice-session', {
        body: {},
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to start voice session');
      }

      if (data?.error === 'VOICE_NOT_INCLUDED') {
        setErrorMessage('Voice is available on Frequent Chraveler and Pro plans');
        setVoiceState('error');
        return;
      }

      // Support both response shapes: { client_secret: { value } } or { value }
      const ephemeralToken = data?.client_secret?.value || data?.value;
      if (!ephemeralToken) {
        throw new Error('No session token received');
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
        setErrorMessage('Microphone access denied. Please allow microphone in your browser settings.');
        setVoiceState('error');
        return;
      }
      streamRef.current = stream;

      // 3. Connect WebSocket with subprotocol auth (OpenAI-compatible)
      const wsUrl = 'wss://api.x.ai/v1/realtime?model=grok-3-fast';
      const ws = new WebSocket(wsUrl, [
        'realtime',
        `openai-insecure-api-key.${ephemeralToken}`,
      ]);
      ws.binaryType = 'arraybuffer';

      // Connection timeout
      connectTimerRef.current = setTimeout(() => {
        if (!openedRef.current) {
          if (import.meta.env.DEV) {
            console.warn('[useGrokVoice] Connection timeout');
          }
          setErrorMessage('Unable to connect to voice service. Please try again.');
          setVoiceState('error');
          cleanup();
        }
      }, CONNECT_TIMEOUT_MS);

      ws.onopen = () => {
        openedRef.current = true;
        activeRef.current = true;
        if (connectTimerRef.current) {
          clearTimeout(connectTimerRef.current);
          connectTimerRef.current = null;
        }

        // Send session.update with full voice agent config
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            voice: 'Sage',
            instructions: 'You are Chravel AI Concierge, a world-class travel expert. Be concise, travel-smart, and action-oriented. Prefer actionable answers and bullets. Keep responses under 30 seconds of speech. Answer travel-related questions with enthusiasm.',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'grok-3-mini' },
            turn_detection: { type: 'server_vad' },
          },
        }));

        // Start mic capture
        shouldStreamRef.current = true;
        startMicCapture(ws, stream);
        setVoiceState('listening');
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;
        try {
          const msg = JSON.parse(event.data);
          handleServerEvent(msg);
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        if (!openedRef.current) {
          // Connection failed before open
          setErrorMessage('Voice connection failed. Please try again.');
          setVoiceState('error');
          cleanup();
        }
      };

      ws.onclose = (event) => {
        if (import.meta.env.DEV) {
          console.log('[useGrokVoice] WS closed:', event.code, event.reason);
        }
        if (!openedRef.current) {
          // Never connected – connection rejected
          setErrorMessage('Voice service unavailable. Please try again later.');
          setVoiceState('error');
        } else if (activeRef.current) {
          // Was active, unexpected close
          setVoiceState('idle');
        }
        activeRef.current = false;
        openedRef.current = false;
      };

      wsRef.current = ws;
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[useGrokVoice] Start error:', err);
      }
      setErrorMessage(err.message || 'Failed to start voice');
      setVoiceState('error');
      cleanup();
    }
  }, [cleanup, startMicCapture, handleServerEvent]);

  // ---------- stop voice ----------
  const stopVoice = useCallback(() => {
    cancelPlayback();
    cleanup();
    setVoiceState('idle');
    setUserTranscript('');
    setAssistantTranscript('');
    assistantTextRef.current = '';
  }, [cleanup, cancelPlayback]);

  // ---------- toggle ----------
  const toggleVoice = useCallback(() => {
    if (voiceState === 'idle' || voiceState === 'error') {
      startVoice();
    } else if (voiceState === 'listening') {
      // Manual commit + request (backup for VAD)
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
        ws.send(JSON.stringify({
          type: 'response.create',
          response: { modalities: ['text', 'audio'] },
        }));
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
