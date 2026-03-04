/**
 * useElevenLabsTTS — React hook for ElevenLabs text-to-speech playback.
 *
 * Calls the elevenlabs-tts Supabase Edge Function (server-side proxy)
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

/** Default ElevenLabs voice ID — Mark (casual, relaxed male voice). */
const DEFAULT_VOICE_ID = '1SM7GgM6IMuvQlz2BwM3';
const RETRYABLE_FETCH_ERROR = 'Failed to fetch';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const toReadablePlaybackError = (err: unknown): string => {
  if (!(err instanceof Error)) return 'TTS playback failed';
  if (err.message === RETRYABLE_FETCH_ERROR) {
    return 'Unable to reach the voice service. Check your connection and app domain configuration, then try again.';
  }
  return err.message || 'TTS playback failed';
};

interface UseElevenLabsTTSOptions {
  /** Override the default voice ID. */
  voiceId?: string;
}

interface UseElevenLabsTTSReturn {
  /** Current playback state. */
  playbackState: TTSPlaybackState;
  /** The message ID currently being played (or null). */
  playingMessageId: string | null;
  /** Error message from the last failed attempt. */
  errorMessage: string | null;
  /** Start TTS playback for a message. Must be called from a user gesture on iOS. */
  play: (messageId: string, speechText: string) => Promise<void>;
  /** Stop the currently playing audio. */
  stop: () => void;
}

export function useElevenLabsTTS(options: UseElevenLabsTTSOptions = {}): UseElevenLabsTTSReturn {
  const { voiceId = DEFAULT_VOICE_ID } = options;

  const [playbackState, setPlaybackState] = useState<TTSPlaybackState>('idle');
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /** Clean up audio element + blob URL. */
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

  /** Stop playback and reset state. */
  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    cleanup();
    setErrorMessage(null);
    setPlaybackState('idle');
    setPlayingMessageId(null);
  }, [cleanup]);

  /** Play TTS for a given message. Interrupts any currently playing audio. */
  const play = useCallback(
    async (messageId: string, speechText: string) => {
      // Interrupt any current playback
      stop();

      if (!speechText.trim()) {
        setErrorMessage('Nothing to speak');
        setPlaybackState('error');
        return;
      }

      setPlaybackState('loading');
      setPlayingMessageId(messageId);
      setErrorMessage(null);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        // Get auth token
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) {
          throw new Error('Not authenticated. Please sign in to use voice.');
        }

        const url = `${SUPABASE_PROJECT_URL}/functions/v1/elevenlabs-tts`;

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
                voice_id: voiceId,
                output_format: 'mp3_44100_128',
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

        if (lastFetchError) {
          throw lastFetchError;
        }

        if (!response) {
          throw new Error('TTS request failed before receiving a response');
        }

        // Check if aborted during fetch
        if (abortController.signal.aborted) return;

        if (!response.ok) {
          let errMsg = 'TTS request failed';
          try {
            const errBody = await response.json();
            errMsg = errBody.error || errMsg;
          } catch {
            // Use default error message
          }

          if (response.status === 429) {
            throw new Error(errMsg);
          }
          throw new Error(errMsg);
        }

        const responseContentType = response.headers.get('content-type') || '';
        if (!responseContentType.includes('audio/')) {
          throw new Error('Voice service returned an unexpected response format');
        }

        const blob = await response.blob();

        // Check if aborted during blob download
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
    [voiceId, stop, cleanup],
  );

  // Cleanup on unmount
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
    play,
    stop,
  };
}
