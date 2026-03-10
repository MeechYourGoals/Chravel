import { useState, useRef, useCallback, useEffect } from 'react';
import {
  supabase,
  SUPABASE_PROJECT_URL,
  SUPABASE_PUBLIC_ANON_KEY,
} from '@/integrations/supabase/client';

export type TTSPlaybackState = 'idle' | 'loading' | 'playing' | 'error';

const RETRYABLE_FETCH_ERROR = 'Failed to fetch';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const toReadablePlaybackError = (err: unknown): string => {
  if (!(err instanceof Error)) return 'TTS playback failed';
  if (err.message === RETRYABLE_FETCH_ERROR) {
    return 'Unable to reach the voice service. Check your connection and app domain configuration, then try again.';
  }
  return err.message || 'TTS playback failed';
};

interface UseGoogleTTSOptions {
  /** Optional language override */
  languageCode?: string;
  /** Optional voice name override */
  voiceName?: string;
}

interface UseGoogleTTSReturn {
  /** Current playback state. */
  playbackState: TTSPlaybackState;
  /** The message ID currently being played (or null). */
  playingMessageId: string | null;
  /** Error message from the last failed attempt. */
  errorMessage: string | null;
  /** Whether the server fell back to a different voice. */
  usedFallbackVoice: boolean;
  /** Start TTS playback for a message. Streams sentences to minimize latency. */
  play: (messageId: string, speechText: string) => Promise<void>;
  /** Stop the currently playing audio. */
  stop: () => void;
}

/**
 * Splits text into sentences and groups them into optimal chunks (e.g. 2-3 sentences)
 * to stream to Google TTS. This minimizes time-to-first-byte (latency) so the user
 * hears audio immediately, while reducing the network overhead of too many tiny requests.
 */
function splitIntoOptimalChunks(text: string): string[] {
  // 1. Split by sentence boundaries (. ! ?)
  const match = text.match(/[^.!?]+[.!?]+/g);
  const sentences = match
    ? match.map(s => s.trim()).filter(Boolean)
    : [text.trim()].filter(Boolean);

  // 2. Group into chunks of roughly ~100-200 chars or max 2 sentences
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > 200 || currentChunk.split(/[.!?]/).length > 2) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export function useGoogleTTS(options: UseGoogleTTSOptions = {}): UseGoogleTTSReturn {
  const [playbackState, setPlaybackState] = useState<TTSPlaybackState>('idle');
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // We don't have a specific fallback voice boolean for Google TTS right now, but keeping for interface compatibility
  const [usedFallbackVoice, setUsedFallbackVoice] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const isPlayingQueueRef = useRef<boolean>(false);
  const blobUrlsRef = useRef<string[]>([]);

  /** Clean up audio elements + blob URLs. */
  const cleanup = useCallback(() => {
    // Pause any currently playing audio
    if (audioQueueRef.current.length > 0) {
      audioQueueRef.current[0].pause();
      audioQueueRef.current[0].removeAttribute('src');
      audioQueueRef.current[0].load();
    }

    // Clear queue
    audioQueueRef.current = [];
    isPlayingQueueRef.current = false;

    // Revoke all blob URLs to free memory
    blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
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

  const processAudioQueue = useCallback(async () => {
    if (isPlayingQueueRef.current || audioQueueRef.current.length === 0) return;

    isPlayingQueueRef.current = true;
    setPlaybackState('playing');

    while (audioQueueRef.current.length > 0) {
      if (abortRef.current?.signal.aborted) break;

      const audio = audioQueueRef.current[0];

      try {
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = _e => reject(new Error('Audio playback failed in queue'));
          audio.play().catch(reject);
        });
      } catch (err) {
        console.error('Queue playback error:', err);
        // If one sentence fails, we stop the whole sequence to prevent weird skipping
        if (!abortRef.current?.signal.aborted) {
          setErrorMessage('Audio playback failed');
          setPlaybackState('error');
          setPlayingMessageId(null);
          cleanup();
          return;
        }
      }

      // Remove the finished audio element
      audioQueueRef.current.shift();
    }

    // Queue finished successfully
    if (!abortRef.current?.signal.aborted) {
      setPlaybackState('idle');
      setPlayingMessageId(null);
      cleanup();
    }
  }, [cleanup]);

  /** Fetch TTS for a single sentence and append it to the queue */
  const fetchAndQueueSentence = useCallback(
    async (sentence: string, accessToken: string, signal: AbortSignal) => {
      const url = `${SUPABASE_PROJECT_URL}/functions/v1/google-tts`;

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
              text: sentence,
              languageCode: options.languageCode || 'en-US',
              name: options.voiceName || 'en-US-Journey-F', // Using Journey voices for higher quality if available
            }),
            signal,
          });
          lastFetchError = null;
          break;
        } catch (fetchErr) {
          lastFetchError = fetchErr;
          if (signal.aborted || attempt === 1) break;
          await sleep(250);
        }
      }

      if (signal.aborted) return;

      if (lastFetchError) throw lastFetchError;
      if (!response) throw new Error('TTS request failed before receiving a response');

      if (!response.ok) {
        let errMsg = 'TTS request failed';
        try {
          const errBody = await response.json();
          errMsg = errBody.error || errMsg;
        } catch (_err) {
          // Fall back to default error message if JSON parsing fails
        }
        throw new Error(errMsg);
      }

      const blob = await response.blob();
      if (signal.aborted) return;

      const blobUrl = URL.createObjectURL(blob);
      blobUrlsRef.current.push(blobUrl);

      const audio = new Audio(blobUrl);
      audioQueueRef.current.push(audio);

      // If the queue isn't already processing, kick it off
      if (!isPlayingQueueRef.current) {
        processAudioQueue();
      }
    },
    [options.languageCode, options.voiceName, processAudioQueue],
  );

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

        // Split text into sentences for low-latency streaming
        const sentences = splitIntoOptimalChunks(speechText);

        // Fire off requests sequentially. Since they queue up, the first one returns fast, starts playing,
        // and subsequent requests fetch in the background while the first is speaking.
        for (const sentence of sentences) {
          if (abortController.signal.aborted) break;
          await fetchAndQueueSentence(sentence, accessToken, abortController.signal);
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
    [stop, fetchAndQueueSentence, cleanup],
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
