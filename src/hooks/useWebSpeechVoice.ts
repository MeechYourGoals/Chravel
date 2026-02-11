/**
 * useWebSpeechVoice – Voice assistant using browser Web Speech API
 * STT via SpeechRecognition, AI via existing concierge, TTS via SpeechSynthesis.
 * Drop-in replacement for useGeminiVoice with identical exported types.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  onAssistantMessage?: (text: string) => void,
): UseGeminiVoiceReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeRef = useRef(false);

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
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
    synthUtteranceRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // Send transcript to concierge and speak the response
  const processWithConcierge = useCallback(async (transcript: string) => {
    setVoiceState('thinking');
    setAssistantTranscript('');

    try {
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          message: transcript,
          analysisType: 'chat',
        },
      });

      if (!activeRef.current) return;

      if (error || !data?.response) {
        setErrorMessage('Failed to get AI response');
        setVoiceState('error');
        return;
      }

      const responseText: string = data.response;
      setAssistantTranscript(responseText);
      onAssistantMessage?.(responseText);

      // Strip markdown for cleaner TTS
      const cleanText = responseText
        .replace(/[#*_~`>]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, ' ')
        .trim();

      // Speak the response
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        setVoiceState('speaking');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05;
        utterance.pitch = 1;
        synthUtteranceRef.current = utterance;

        utterance.onend = () => {
          if (!activeRef.current) return;
          setVoiceState('idle');
          synthUtteranceRef.current = null;
        };

        utterance.onerror = () => {
          if (!activeRef.current) return;
          setVoiceState('idle');
          synthUtteranceRef.current = null;
        };

        window.speechSynthesis.cancel(); // Clear any queued speech
        window.speechSynthesis.speak(utterance);
      } else {
        // No TTS available, just go back to idle
        setVoiceState('idle');
      }
    } catch (err) {
      if (!activeRef.current) return;
      console.error('[useWebSpeechVoice] Concierge error:', err);
      setErrorMessage('AI service error. Please try again.');
      setVoiceState('error');
    }
  }, [onAssistantMessage]);

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
    setAssistantTranscript('');

    try {
      // Request mic permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      setErrorMessage('Microphone access denied. Please allow mic permission.');
      setVoiceState('error');
      return;
    }

    activeRef.current = true;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      if (!activeRef.current) return;
      setVoiceState('listening');
    };

    recognition.onresult = (event: any) => {
      if (!activeRef.current) return;
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setUserTranscript(finalTranscript);
        onUserMessage?.(finalTranscript);
        processWithConcierge(finalTranscript);
      } else if (interimTranscript) {
        setUserTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (!activeRef.current) return;
      const errType = event.error;
      if (errType === 'no-speech') {
        // User didn't say anything - just go back to idle
        setVoiceState('idle');
        activeRef.current = false;
        return;
      }
      if (errType === 'aborted') {
        // User cancelled - no error
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
      // Recognition ended naturally (e.g., silence timeout)
      // If we're still in listening state (no final result), go idle
      if (activeRef.current) {
        setVoiceState(prev => (prev === 'listening' ? 'idle' : prev));
        if (recognitionRef.current === recognition) {
          activeRef.current = false;
        }
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
  }, [onUserMessage, processWithConcierge]);

  // Stop voice
  const stopVoice = useCallback(() => {
    cleanup();
    setVoiceState('idle');
  }, [cleanup]);

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
    assistantTranscript,
    errorMessage,
    debugInfo,
    startVoice,
    stopVoice,
    toggleVoice,
  };
}
