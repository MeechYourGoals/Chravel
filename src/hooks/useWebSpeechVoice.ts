/**
 * useWebSpeechVoice – Robust Speech-to-Text using browser Web Speech API
 *
 * iOS Safari quirks handled:
 *  1. No redundant getUserMedia — SpeechRecognition manages its own mic.
 *  2. Auto-restart: iOS fires `onend` after every pause even with continuous=true.
 *     We automatically restart recognition while the user intends to keep dictating.
 *  3. Silence finalization: 2s of silence auto-sends the transcript.
 *  4. PWA detection: iOS PWA (standalone) may not support Web Speech — clear error.
 *  5. Cleanup: visibility change, unmount, and rapid toggles are all handled.
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

// ---------- Platform detection ----------
const isIOS =
  typeof navigator !== 'undefined' &&
  /iP(hone|ad|od)/.test(navigator.userAgent);

const isIOSPWA =
  isIOS &&
  typeof window !== 'undefined' &&
  (window.navigator as any).standalone === true;

// ---------- Browser support ----------
const SpeechRecognitionClass =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

// iOS Safari caps continuous recognition at ~60s and fires onend on every pause.
// We auto-restart up to this many times per session to keep dictation alive.
const IOS_MAX_RESTARTS = 20;

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
  const restartCountRef = useRef(0);
  const intentionalStopRef = useRef(false);

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
    mediaDevicesSupported:
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia),
    lastMediaErrorName: null,
  });

  // ── Cleanup ──────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    activeRef.current = false;
    intentionalStopRef.current = true;
    restartCountRef.current = 0;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  // ── Visibility: stop recording when tab/app is backgrounded ─────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && activeRef.current) {
        // Finalize whatever we have
        const text = accumulatedTranscriptRef.current.trim();
        if (text) {
          onUserMessage?.(text);
        }
        cleanup();
        setVoiceState('idle');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [cleanup, onUserMessage]);

  // ── Finalize: send transcript and reset ──────────────────────────────────
  const finalizeTranscript = useCallback(() => {
    const text = accumulatedTranscriptRef.current.trim();
    if (text) {
      onUserMessage?.(text);
    }
    accumulatedTranscriptRef.current = '';
    setUserTranscript('');
    cleanup();
    setVoiceState('idle');
  }, [onUserMessage, cleanup]);

  // ── Create & wire a new SpeechRecognition instance ──────────────────────
  const createRecognition = useCallback(() => {
    const recognition = new SpeechRecognitionClass();

    // iOS Safari: continuous=true is unreliable but still needed for Chrome.
    // We handle iOS restarts via onend.
    recognition.continuous = !isIOS;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    // iOS Safari may support maxAlternatives but we only need the best result
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (!activeRef.current) return;
      setVoiceState('listening');
    };

    recognition.onresult = (event: any) => {
      if (!activeRef.current) return;

      let finalText = '';
      let interimText = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      // Accumulate final results; show interim for feedback
      if (finalText) {
        // Append final text (don't overwrite previous finals from restarts)
        const prev = accumulatedTranscriptRef.current;
        const separator = prev && !prev.endsWith(' ') ? ' ' : '';
        accumulatedTranscriptRef.current = prev + separator + finalText;
      }

      // Show the user what we have so far
      const display = accumulatedTranscriptRef.current + (interimText ? ' ' + interimText : '');
      setUserTranscript(display);

      // Reset silence debounce on every result
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

      // These are normal lifecycle events, not real errors
      if (errType === 'no-speech' || errType === 'aborted') {
        // On iOS, no-speech fires quickly — just let onend handle restart
        if (isIOS && errType === 'no-speech') return;
        setVoiceState('idle');
        activeRef.current = false;
        return;
      }

      // "not-allowed" means permission denied
      if (errType === 'not-allowed') {
        setErrorMessage(
          'Microphone access denied. Please enable microphone permission in your device Settings.',
        );
        setVoiceState('error');
        activeRef.current = false;
        return;
      }

      // "network" error can happen on iOS PWA
      if (errType === 'network') {
        setErrorMessage(
          'Voice recognition requires an internet connection. Please check your connection and try again.',
        );
        setVoiceState('error');
        activeRef.current = false;
        return;
      }

      console.error('[useWebSpeechVoice] Recognition error:', errType);
      setErrorMessage(`Voice error: ${errType}`);
      setVoiceState('error');
      activeRef.current = false;
    };

    recognition.onend = () => {
      // If we intentionally stopped, don't restart
      if (intentionalStopRef.current || !activeRef.current) {
        if (activeRef.current && accumulatedTranscriptRef.current.trim()) {
          finalizeTranscript();
        }
        return;
      }

      // iOS auto-restart: recognition ended but user didn't tap stop
      if (isIOS && activeRef.current && restartCountRef.current < IOS_MAX_RESTARTS) {
        restartCountRef.current++;
        // Small delay to avoid rapid restart loops
        setTimeout(() => {
          if (!activeRef.current || intentionalStopRef.current) return;
          try {
            const newRecognition = createRecognition();
            recognitionRef.current = newRecognition;
            newRecognition.start();
          } catch (err) {
            console.error('[useWebSpeechVoice] iOS restart failed:', err);
            if (accumulatedTranscriptRef.current.trim()) {
              finalizeTranscript();
            } else {
              setVoiceState('idle');
              activeRef.current = false;
            }
          }
        }, 100);
        return;
      }

      // Non-iOS or max restarts reached: finalize
      if (accumulatedTranscriptRef.current.trim()) {
        finalizeTranscript();
      } else {
        setVoiceState('idle');
        activeRef.current = false;
      }
    };

    return recognition;
  }, [finalizeTranscript]);

  // ── Start voice recognition ─────────────────────────────────────────────
  const startVoice = useCallback(async () => {
    if (activeRef.current) return;

    if (!SpeechRecognitionClass) {
      // Provide platform-specific guidance
      if (isIOSPWA) {
        setErrorMessage(
          'Voice dictation may not be available in this app mode. Try opening in Safari, or use the keyboard.',
        );
      } else {
        setErrorMessage('Voice not supported in this browser. Try Chrome or Safari.');
      }
      setVoiceState('error');
      return;
    }

    setVoiceState('connecting');
    setErrorMessage(null);
    setUserTranscript('');
    accumulatedTranscriptRef.current = '';
    restartCountRef.current = 0;
    intentionalStopRef.current = false;

    // NOTE: We do NOT call getUserMedia here. SpeechRecognition manages its
    // own microphone access. Calling getUserMedia separately causes double
    // permission prompts and can break on iOS Safari / PWA.

    activeRef.current = true;

    try {
      const recognition = createRecognition();
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('[useWebSpeechVoice] Failed to start recognition:', err);
      setErrorMessage('Failed to start voice recognition. Please try again.');
      setVoiceState('error');
      activeRef.current = false;
    }
  }, [createRecognition]);

  // ── Stop voice — finalizes any pending transcript ───────────────────────
  const stopVoice = useCallback(() => {
    intentionalStopRef.current = true;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (activeRef.current && accumulatedTranscriptRef.current.trim()) {
      finalizeTranscript();
    } else {
      cleanup();
      setVoiceState('idle');
    }
  }, [cleanup, finalizeTranscript]);

  // ── Toggle voice ────────────────────────────────────────────────────────
  const toggleVoice = useCallback(() => {
    if (voiceState === 'idle' || voiceState === 'error') {
      void startVoice();
    } else {
      stopVoice();
    }
  }, [voiceState, startVoice, stopVoice]);

  return {
    voiceState,
    userTranscript,
    assistantTranscript: '',
    errorMessage,
    debugInfo,
    startVoice,
    stopVoice,
    toggleVoice,
  };
}
