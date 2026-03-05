/**
 * useElevenLabsHealth — Proactive session-start health check for concierge TTS.
 *
 * Fires once per browser session (guarded by sessionStorage) to verify
 * the voice edge function and upstream provider key are operational.
 * Non-blocking: does not delay UI rendering.
 */
import { useState, useEffect } from 'react';
import {
  supabase,
  SUPABASE_PROJECT_URL,
  SUPABASE_PUBLIC_ANON_KEY,
} from '@/integrations/supabase/client';

const SESSION_KEY = 'chravel_tts_health_checked';

interface UseElevenLabsHealthReturn {
  /** Whether the health check has completed. */
  checked: boolean;
  /** Whether TTS is available (null = not yet checked). */
  available: boolean | null;
}

export function useElevenLabsHealth(): UseElevenLabsHealthReturn {
  const [checked, setChecked] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    // Only run once per session
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        setChecked(true);
        setAvailable(true); // Assume healthy from previous check
        return;
      }
    } catch {
      // sessionStorage unavailable — skip guard
    }

    let mounted = true;

    async function checkHealth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          // Not logged in — skip health check
          if (mounted) {
            setChecked(true);
            setAvailable(null);
          }
          return;
        }

        const url = `${SUPABASE_PROJECT_URL}/functions/v1/elevenlabs-tts`;

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: SUPABASE_PUBLIC_ANON_KEY,
          },
          body: JSON.stringify({
            speech_text: 'ok',
            output_format: 'mp3_22050_32', // Smallest format for speed
          }),
          signal: AbortSignal.timeout(8000),
        });

        const isHealthy = res.ok && (res.headers.get('content-type') || '').includes('audio/');

        if (mounted) {
          setAvailable(isHealthy);
          setChecked(true);
        }

        if (isHealthy) {
          try {
            sessionStorage.setItem(SESSION_KEY, '1');
          } catch {
            /* ok */
          }
        }
      } catch {
        if (mounted) {
          setAvailable(false);
          setChecked(true);
        }
      }
    }

    // Fire-and-forget after a short delay to not compete with initial load
    const timer = setTimeout(checkHealth, 3000);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  return { checked, available };
}
