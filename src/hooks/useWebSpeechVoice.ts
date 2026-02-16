/**
 * useWebSpeechVoice – Pure Speech-to-Text hook using browser Web Speech API
 * Transcribes speech and calls onUserMessage with the final text.
 * Does NOT call any AI endpoint – the parent component routes text
 * through the same pipeline used for typed messages.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface VoiceDebugInfo {
  selectedModel: string;
  selectedVoiceName: string;
  authMode: null;
  gateAllowed: boolean | null;
  gateStatus: null;
  gateCode: null;
  gateMessage: string | null;
  setupComplete: boolean;
  wsPhase: 'idle';
  wsCloseCode: null;
  wsCloseReason: null;
  mediaDevicesSupported: boolean;
  lastMediaErrorName: string | null;
}

export interface UseGeminiVoiceReturn {
  voiceState: VoiceState;
  userTranscript: string;
  assistantTranscript: string;
  errorMessage: string | null;
  debugInfo: VoiceDebugInfo;
  startVoice: () => Promise<void>;
  stopVoice: () => void;
  toggleVoice: () => void;
}

// Check browser support
const SpeechRecognitionClass =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function useWebSpeechVoice(
  onUserMessage?: (text: string) => void,
  _onAssistantMessage?: (text: string) => void,
): UseGeminiVoiceReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const activeRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedTranscriptRef = useRef('');

  const [debugInfo] = useState<VoiceDebugInfo>({
    selectedModel: 'web-speech-api',
    selectedVoiceName: 'browser-default',
    authMode: null,
    gateAllowed: true,
    gateStatus: null,
    gateCode: null,
    gateMessage: null,
    setupComplete: false,
    wsPhase: 'idle',
    wsCloseCode: null,
    wsCloseReason: null,
    mediaDevicesSupported: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
    lastMediaErrorName: null,
  });

  // Cleanup
  const cleanup = useCallback(() => {
    activeRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // Finalize: send accumulated transcript and reset
  const finalizeTranscript = useCallback(() => {
    const text = accumulatedTranscriptRef.current.trim();
    if (text) {
      onUserMessage?.(text);
    }
    accumulatedTranscriptRef.current = '';
    setVoiceState('idle');
    activeRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
  }, [onUserMessage]);

  // Start voice recognition
  const startVoice = useCallback(async () => {
    if (activeRef.current) return;

    if (!SpeechRecognitionClass) {
      setErrorMessage('Voice not supported in this browser. Try Chrome or Safari.');
      setVoiceState('error');
      return;
    }

    setVoiceState('connecting');
    setErrorMessage(null);
    setUserTranscript('');
    accumulatedTranscriptRef.current = '';

    try {
      // Timeout after 15s if user never responds to mic permission prompt
      const mediaPromise = navigator.mediaDevices.getUserMedia({ audio: true });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Microphone permission timed out')), 15_000),
      );
      await Promise.race([mediaPromise, timeoutPromise]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access failed';
      setErrorMessage(
        msg.includes('timed out')
          ? 'Microphone permission timed out. Please allow mic access and try again.'
          : 'Microphone access denied. Please allow mic permission.',
      );
      setVoiceState('error');
      return;
    }

    activeRef.current = true;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;       // Keep listening across pauses
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      if (!activeRef.current) return;
      setVoiceState('listening');
    };

    recognition.onresult = (event: any) => {
      if (!activeRef.current) return;

      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }

      // Update display
      setUserTranscript(fullTranscript);
      accumulatedTranscriptRef.current = fullTranscript;

      // Reset 2-second silence debounce on every result
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      silenceTimerRef.current = setTimeout(() => {
        if (activeRef.current) {
          finalizeTranscript();
        }
      }, 2000);
    };

    recognition.onerror = (event: any) => {
      if (!activeRef.current) return;
      const errType = event.error;
      if (errType === 'no-speech' || errType === 'aborted') {
        setVoiceState('idle');
        activeRef.current = false;
        return;
      }
      console.error('[useWebSpeechVoice] Recognition error:', errType);
      setErrorMessage(`Voice error: ${errType}`);
      setVoiceState('error');
      activeRef.current = false;
    };

    recognition.onend = () => {
      // With continuous=true, onend fires when the browser stops
      // (e.g., after a long silence or system limit).
      // If we still have accumulated text, finalize it.
      if (activeRef.current && accumulatedTranscriptRef.current.trim()) {
        finalizeTranscript();
      } else if (activeRef.current) {
        setVoiceState('idle');
        activeRef.current = false;
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('[useWebSpeechVoice] Failed to start recognition:', err);
      setErrorMessage('Failed to start voice recognition');
      setVoiceState('error');
      activeRef.current = false;
    }
  }, [finalizeTranscript]);

  // Stop voice — also finalizes any pending transcript
  const stopVoice = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    // If there's accumulated text, send it before stopping
    if (activeRef.current && accumulatedTranscriptRef.current.trim()) {
      finalizeTranscript();
    } else {
      cleanup();
      setVoiceState('idle');
    }
  }, [cleanup, finalizeTranscript]);

  // Toggle voice
  const toggleVoice = useCallback(() => {
    if (voiceState === 'idle' || voiceState === 'error') {
      startVoice();
    } else {
      stopVoice();
    }
  }, [voiceState, startVoice, stopVoice]);

  return {
    voiceState,
    userTranscript,
    assistantTranscript: '', // No longer used — responses appear as normal chat messages
    errorMessage,
    debugInfo,
    startVoice,
    stopVoice,
    toggleVoice,
  };
}
