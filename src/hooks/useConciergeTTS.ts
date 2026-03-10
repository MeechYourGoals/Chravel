/**
 * useConciergeTTS — React hook for concierge text-to-speech playback.
 *
 * Calls the concierge-tts Supabase Edge Function (server-side TTS proxy)
 * and plays the returned audio/mpeg blob. Handles iOS/PWA constraints
 * (user gesture required), stop/interrupt, error recovery, and cleanup.
 *
 * Voice IDs are resolved from the `app_settings` table (DB-configurable).
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  supabase,
  SUPABASE_PROJECT_URL,
  SUPABASE_PUBLIC_ANON_KEY,
} from '@/integrations/supabase/client';

export type TTSPlaybackState = 'idle' | 'loading' | 'playing' | 'error';

/** Last-resort fallback if DB lookup fails and no voiceId prop is passed. */
const FALLBACK_VOICE_ID = 'en-US-Chirp3-HD-Charon';
const RETRYABLE_FETCH_ERROR = 'Failed to fetch';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const toReadablePlaybackError = (err: unknown): string => {
  if (!(err instanceof Error)) return 'TTS playback failed';
  if (err.message === RETRYABLE_FETCH_ERROR) {
    return 'Unable to reach the voice service. Check your connection and app domain configuration, then try again.';
  }
  return err.message || 'TTS playback failed';
};

/** Cached DB voice ID — fetched once per session. */
let cachedPrimaryVoice: string | null = null;
let voiceFetchPromise: Promise<string | null> | null = null;

async function fetchPrimaryVoiceId(): Promise<string | null> {
  if (cachedPrimaryVoice) return cachedPrimaryVoice;
  if (voiceFetchPromise) return voiceFetchPromise;

  voiceFetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'tts_primary_voice_id')
        .maybeSingle();
      if (error || !data?.value) return null;
      cachedPrimaryVoice = data.value;
      return cachedPrimaryVoice;
    } catch {
      return null;
    } finally {
      voiceFetchPromise = null;
    }
  })();

  return voiceFetchPromise;
}

interface UseConciergeTTSOptions {
  /** Override the default voice ID. */
  voiceId?: string;
}

interface UseConciergeTTSReturn {
  /** Current playback state. */
  playbackState: TTSPlaybackState;
  /** The message ID currently being played (or null). */
  playingMessageId: string | null;
  /** Error message from the last failed attempt. */
  errorMessage: string | null;
  /** Whether the server fell back to a different voice. */
  usedFallbackVoice: boolean;
  /** Start TTS playback for a message. Must be called from a user gesture on iOS. */
  play: (messageId: string, speechText: string) => Promise<void>;
  /** Stop the currently playing audio. */
  stop: () => void;
}

export function useConciergeTTS(options: UseConciergeTTSOptions = {}): UseConciergeTTSReturn {
  const { voiceId: voiceIdProp } = options;

  const [playbackState, setPlaybackState] = useState<TTSPlaybackState>('idle');
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usedFallbackVoice, setUsedFallbackVoice] = useState(false);

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
    setUsedFallbackVoice(false);
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
      setUsedFallbackVoice(false);

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

        // Resolve voice ID: prop > DB setting > hardcoded fallback
        let resolvedVoiceId = voiceIdProp;
        if (!resolvedVoiceId) {
          resolvedVoiceId = (await fetchPrimaryVoiceId()) || FALLBACK_VOICE_ID;
        }

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

        // Check for fallback voice header
        const fallbackHeader = response.headers.get('x-voice-fallback');
        if (fallbackHeader === 'true') {
          setUsedFallbackVoice(true);
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
    [voiceIdProp, stop, cleanup],
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
    usedFallbackVoice,
    play,
    stop,
  };
}
