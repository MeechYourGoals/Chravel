/**
 * useConciergeReadAloud — React hook for concierge text-to-speech playback.
 *
 * Splits text into sentences, fetches audio for the first sentence immediately,
 * and pre-fetches subsequent sentences for gapless playback.
 * Handles iOS/PWA constraints, stop/interrupt, error recovery, and cleanup.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  supabase,
  SUPABASE_PROJECT_URL,
  SUPABASE_PUBLIC_ANON_KEY,
} from '@/integrations/supabase/client';

export type TTSPlaybackState = 'idle' | 'loading' | 'playing' | 'error';

const DEFAULT_VOICE = 'en-US-Neural2-J';
const RETRYABLE_FETCH_ERROR = 'Failed to fetch';
const TTS_URL = `${SUPABASE_PROJECT_URL}/functions/v1/concierge-tts`;

const toReadablePlaybackError = (err: unknown): string => {
  if (!(err instanceof Error)) return 'TTS playback failed';
  if (err.message === RETRYABLE_FETCH_ERROR) {
    return 'Unable to reach the voice service. Check your connection and try again.';
  }
  return err.message || 'TTS playback failed';
};

/** Split text into sentences for chunked TTS. */
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end of string
  const raw = text.match(/[^.!?]*[.!?]+[\s]*/g);
  if (!raw) return [text.trim()].filter(Boolean);
  
  const sentences: string[] = [];
  let buffer = '';
  
  for (const segment of raw) {
    buffer += segment;
    // Only split if the buffer is long enough (avoid tiny fragments)
    if (buffer.trim().length >= 20) {
      sentences.push(buffer.trim());
      buffer = '';
    }
  }
  
  // Capture any remaining text
  const remaining = text.slice(raw.join('').length).trim();
  if (remaining) buffer += ' ' + remaining;
  if (buffer.trim()) {
    if (sentences.length > 0 && buffer.trim().length < 20) {
      // Merge short trailing fragment with last sentence
      sentences[sentences.length - 1] += ' ' + buffer.trim();
    } else {
      sentences.push(buffer.trim());
    }
  }
  
  return sentences.length > 0 ? sentences : [text.trim()].filter(Boolean);
}

interface UseConciergeReadAloudOptions {
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

/** Fetch a single sentence's audio as a blob URL. */
async function fetchSentenceAudio(
  sentence: string,
  voiceId: string,
  accessToken: string,
  signal: AbortSignal,
): Promise<{ blobUrl: string; usedFallback: boolean }> {
  const response = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_PUBLIC_ANON_KEY,
    },
    body: JSON.stringify({
      speech_text: sentence,
      voice_id: voiceId,
      output_format: 'mp3',
    }),
    signal,
  });

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

  const usedFallback = response.headers.get('x-voice-fallback') === 'true';
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('audio/')) {
    throw new Error('Voice service returned an unexpected response format');
  }

  const blob = await response.blob();
  return { blobUrl: URL.createObjectURL(blob), usedFallback };
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
  const blobUrlsRef = useRef<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    for (const url of blobUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    blobUrlsRef.current = [];
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
        const sentences = splitIntoSentences(speechText);

        // Fetch first sentence immediately
        const first = await fetchSentenceAudio(
          sentences[0],
          resolvedVoiceId,
          accessToken,
          abortController.signal,
        );
        if (abortController.signal.aborted) return;

        blobUrlsRef.current.push(first.blobUrl);
        if (first.usedFallback) setUsedFallbackVoice(true);

        // Start pre-fetching remaining sentences in parallel (max 3 concurrent)
        const remainingPromises: Promise<{ blobUrl: string; usedFallback: boolean } | null>[] = [];
        for (let i = 1; i < sentences.length; i++) {
          remainingPromises.push(
            fetchSentenceAudio(sentences[i], resolvedVoiceId, accessToken, abortController.signal)
              .catch(() => null), // Don't fail the whole chain if a later chunk fails
          );
        }

        // Play first sentence immediately
        const playNextInQueue = async (blobUrl: string, index: number) => {
          if (abortController.signal.aborted) return;

          const audio = new Audio(blobUrl);
          audioRef.current = audio;

          return new Promise<void>((resolve, reject) => {
            audio.onended = () => resolve();
            audio.onerror = () => reject(new Error('Audio playback failed'));

            if (index === 0) setPlaybackState('playing');
            audio.play().catch(reject);
          });
        };

        // Play first sentence
        await playNextInQueue(first.blobUrl, 0);
        if (abortController.signal.aborted) return;

        // Play remaining sentences sequentially as they resolve
        for (let i = 0; i < remainingPromises.length; i++) {
          if (abortController.signal.aborted) return;
          const result = await remainingPromises[i];
          if (!result || abortController.signal.aborted) continue;

          blobUrlsRef.current.push(result.blobUrl);
          if (result.usedFallback) setUsedFallbackVoice(true);

          await playNextInQueue(result.blobUrl, i + 1);
        }

        // All sentences played
        if (!abortController.signal.aborted) {
          cleanup();
          setPlaybackState('idle');
          setPlayingMessageId(null);
        }
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
