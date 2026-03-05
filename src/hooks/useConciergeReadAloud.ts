/**
 * useConciergeReadAloud — React hook for concierge text-to-speech playback.
 *
 * Calls the concierge-tts Supabase Edge Function (Google Cloud TTS proxy)
 * and plays the returned audio/mpeg blob. Handles iOS/PWA constraints
 * (user gesture required), stop/interrupt, error recovery, and cleanup.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  supabase,
  SUPABASE_PROJECT_URL,
  SUPABASE_PUBLIC_ANON_KEY,
} from '@/integrations/supabase/client';

export type TTSPlaybackState = 'idle' | 'loading' | 'playing' | 'error';

/** Default Google Cloud TTS voice. */
const DEFAULT_VOICE = 'en-US-Neural2-J';
const RETRYABLE_FETCH_ERROR = 'Failed to fetch';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const toReadablePlaybackError = (err: unknown): string => {
  if (!(err instanceof Error)) return 'TTS playback failed';
  if (err.message === RETRYABLE_FETCH_ERROR) {
    return 'Unable to reach the voice service. Check your connection and try again.';
  }
  return err.message || 'TTS playback failed';
};

interface UseConciergeReadAloudOptions {
  /** Override the default Google Cloud TTS voice name. */
  voiceId?: string;
}

interface UseConciergeReadAloudReturn {
  playbackState: TTSPlaybackState;
  playingMessageId: string | null;
  errorMessage: string | null;
  usedFallbackVoice: boolean;
  play: (messageId: string, speechText: string) => Promise<void>;
  stop: () => void;
}

export function useConciergeReadAloud(
  options: UseConciergeReadAloudOptions = {},
): UseConciergeReadAloudReturn {
  const { voiceId: voiceIdProp } = options;

  const [playbackState, setPlaybackState] = useState<TTSPlaybackState>('idle');
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usedFallbackVoice, setUsedFallbackVoice] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    cleanup();
    setErrorMessage(null);
    setPlaybackState('idle');
    setPlayingMessageId(null);
    setUsedFallbackVoice(false);
  }, [cleanup]);

  const play = useCallback(
    async (messageId: string, speechText: string) => {
      stop();

      if (!speechText.trim()) {
        setErrorMessage('Nothing to speak');
        setPlaybackState('error');
        return;
      }

      setPlaybackState('loading');
      setPlayingMessageId(messageId);
      setErrorMessage(null);
      setUsedFallbackVoice(false);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) {
          throw new Error('Not authenticated. Please sign in to use voice.');
        }

        const resolvedVoiceId = voiceIdProp || DEFAULT_VOICE;
        const url = `${SUPABASE_PROJECT_URL}/functions/v1/concierge-tts`;

        let response: Response | null = null;
        let lastFetchError: unknown = null;

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                apikey: SUPABASE_PUBLIC_ANON_KEY,
              },
              body: JSON.stringify({
                speech_text: speechText,
                voice_id: resolvedVoiceId,
                output_format: 'mp3',
              }),
              signal: abortController.signal,
            });
            lastFetchError = null;
            break;
          } catch (fetchErr) {
            lastFetchError = fetchErr;
            if (abortController.signal.aborted || attempt === 1) break;
            await sleep(250);
          }
        }

        if (lastFetchError) throw lastFetchError;
        if (!response) throw new Error('TTS request failed before receiving a response');
        if (abortController.signal.aborted) return;

        if (!response.ok) {
          let errMsg = 'TTS request failed';
          try {
            const errBody = await response.json();
            errMsg = errBody.error || errMsg;
          } catch {
            // Use default
          }
          throw new Error(errMsg);
        }

        const fallbackHeader = response.headers.get('x-voice-fallback');
        if (fallbackHeader === 'true') {
          setUsedFallbackVoice(true);
        }

        const responseContentType = response.headers.get('content-type') || '';
        if (!responseContentType.includes('audio/')) {
          throw new Error('Voice service returned an unexpected response format');
        }

        const blob = await response.blob();
        if (abortController.signal.aborted) return;

        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;

        const audio = new Audio(blobUrl);
        audioRef.current = audio;

        audio.onended = () => {
          cleanup();
          setPlaybackState('idle');
          setPlayingMessageId(null);
        };

        audio.onerror = () => {
          cleanup();
          setErrorMessage('Audio playback failed');
          setPlaybackState('error');
          setPlayingMessageId(null);
        };

        setPlaybackState('playing');
        await audio.play();
      } catch (err) {
        if (abortController.signal.aborted) return;
        const msg = toReadablePlaybackError(err);
        setErrorMessage(msg);
        setPlaybackState('error');
        setPlayingMessageId(null);
        cleanup();
      }
    },
    [voiceIdProp, stop, cleanup],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      cleanup();
    };
  }, [cleanup]);

  return {
    playbackState,
    playingMessageId,
    errorMessage,
    usedFallbackVoice,
    play,
    stop,
  };
}
