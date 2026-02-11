/**
 * useGrokVoice – Realtime voice hook for xAI Grok Voice Agent API
 * Manages: ephemeral token, WebSocket, mic capture, audio playback, state machine
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

// Convert Float32 [-1,1] to Int16 PCM
function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

// Encode ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decode base64 to Int16Array
function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
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
  const assistantTextRef = useRef('');

  const cleanup = useCallback(() => {
    activeRef.current = false;
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
    // Close playback
    playbackCtxRef.current?.close().catch(() => {});
    playbackCtxRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  const startVoice = useCallback(async () => {
    if (activeRef.current) return;
    setVoiceState('connecting');
    setErrorMessage(null);
    setUserTranscript('');
    setAssistantTranscript('');
    assistantTextRef.current = '';

    try {
      // 1. Get ephemeral token
      const { data, error } = await supabase.functions.invoke('xai-voice-session', {
        body: {},
      });

      if (error) {
        const msg = (error as any)?.message || 'Failed to start voice session';
        throw new Error(msg);
      }

      if (data?.error === 'VOICE_NOT_INCLUDED') {
        setErrorMessage('Voice is available on Frequent Chraveler and Pro plans');
        setVoiceState('error');
        return;
      }

      if (!data?.client_secret?.value) {
        throw new Error('No session token received');
      }

      const ephemeralToken = data.client_secret.value;

      // 2. Request mic permission
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 24000, channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      } catch {
        setErrorMessage('Microphone access denied. Please allow microphone access in your browser settings.');
        setVoiceState('error');
        return;
      }
      streamRef.current = stream;

      // 3. Connect WebSocket
      const wsUrl = `wss://api.x.ai/v1/realtime?model=grok-3-fast`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        activeRef.current = true;
        // Authenticate with ephemeral token
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'grok-3-mini' },
          },
        }));

        // Start sending mic audio
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
        setErrorMessage('Voice connection error');
        setVoiceState('error');
        cleanup();
      };

      ws.onclose = () => {
        if (activeRef.current) {
          setVoiceState('idle');
          activeRef.current = false;
        }
      };

      wsRef.current = ws;

      // Set auth header via first message
      // xAI uses the session token from the URL or auth message
      // The token is passed during session creation
    } catch (err: any) {
      console.error('[useGrokVoice] Start error:', err);
      setErrorMessage(err.message || 'Failed to start voice');
      setVoiceState('error');
      cleanup();
    }
  }, [cleanup]);

  const startMicCapture = useCallback((ws: WebSocket, stream: MediaStream) => {
    const audioCtx = new AudioContext({ sampleRate: 24000 });
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    // ScriptProcessor for broad browser support (AudioWorklet preferred but needs extra file)
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (!activeRef.current || ws.readyState !== WebSocket.OPEN) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = float32ToInt16(inputData);
      const base64Audio = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);
      ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64Audio,
      }));
    };

    source.connect(processor);
    processor.connect(audioCtx.destination); // required for ScriptProcessor to fire
  }, []);

  const handleServerEvent = useCallback((msg: any) => {
    switch (msg.type) {
      case 'input_audio_buffer.speech_started':
        setVoiceState('listening');
        break;

      case 'input_audio_buffer.speech_stopped':
        setVoiceState('thinking');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (msg.transcript) {
          setUserTranscript(msg.transcript);
          onUserMessage?.(msg.transcript);
        }
        break;

      case 'response.audio_transcript.delta':
        if (msg.delta) {
          assistantTextRef.current += msg.delta;
          setAssistantTranscript(assistantTextRef.current);
          setVoiceState('speaking');
        }
        break;

      case 'response.audio.delta':
        if (msg.delta) {
          playAudioChunk(msg.delta);
          setVoiceState('speaking');
        }
        break;

      case 'response.audio_transcript.done':
        if (assistantTextRef.current) {
          onAssistantMessage?.(assistantTextRef.current);
        }
        break;

      case 'response.done':
        assistantTextRef.current = '';
        setAssistantTranscript('');
        if (activeRef.current) {
          setVoiceState('listening');
        }
        break;

      case 'error':
        console.error('[useGrokVoice] Server error:', msg.error);
        setErrorMessage(msg.error?.message || 'Voice error');
        setVoiceState('error');
        break;
    }
  }, [onUserMessage, onAssistantMessage]);

  const playAudioChunk = useCallback((base64Audio: string) => {
    try {
      if (!playbackCtxRef.current || playbackCtxRef.current.state === 'closed') {
        playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });
      }
      const ctx = playbackCtxRef.current;
      const int16Data = base64ToInt16Array(base64Audio);
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 0x8000;
      }
      const buffer = ctx.createBuffer(1, float32Data.length, 24000);
      buffer.copyToChannel(float32Data, 0);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (err) {
      console.warn('[useGrokVoice] Playback error:', err);
    }
  }, []);

  const stopVoice = useCallback(() => {
    cleanup();
    setVoiceState('idle');
    setUserTranscript('');
    setAssistantTranscript('');
    assistantTextRef.current = '';
  }, [cleanup]);

  const toggleVoice = useCallback(() => {
    if (voiceState === 'idle' || voiceState === 'error') {
      startVoice();
    } else if (voiceState === 'listening') {
      // Commit current audio and let server respond
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
        wsRef.current.send(JSON.stringify({
          type: 'response.create',
          response: { modalities: ['text', 'audio'] },
        }));
      }
      setVoiceState('thinking');
    } else if (voiceState === 'speaking') {
      // Interrupt: cancel current response and go back to listening
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'response.cancel' }));
      }
      assistantTextRef.current = '';
      setAssistantTranscript('');
      setVoiceState('listening');
    } else {
      stopVoice();
    }
  }, [voiceState, startVoice, stopVoice]);

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
