/**
 * Voice diagnostics state management hook.
 *
 * Extracted from useGeminiLive to isolate diagnostics concerns:
 * - Diagnostics state + patching
 * - Metrics tracking
 * - RMS flush loop (throttles 60fps audio callbacks to ~15fps React state updates)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { VoiceDiagnostics } from '@/hooks/useGeminiLive';
import { LIVE_INPUT_MIME } from '@/voice/liveConstants';

const initialDiagnostics: VoiceDiagnostics = {
  enabled:
    (typeof import.meta !== 'undefined' &&
      (import.meta.env.VITE_VOICE_DEBUG || '').toLowerCase() === 'true') ||
    (typeof import.meta !== 'undefined' && import.meta.env.DEV) ||
    false,
  connectionStatus: 'idle',
  audioContextState: 'unavailable',
  audioSampleRate: null,
  inputEncoding: LIVE_INPUT_MIME,
  micPermission: 'unknown',
  micDeviceLabel: null,
  micRms: 0,
  playbackRms: 0,
  wsCloseCode: null,
  wsCloseReason: null,
  reconnectAttempts: 0,
  lastError: null,
  substep: null,
  metrics: {
    firstAudioChunkSentMs: null,
    firstTokenReceivedMs: null,
    firstAudioFramePlayedMs: null,
    cancelLatencyMs: null,
  },
};

export interface UseVoiceDiagnosticsReturn {
  diagnostics: VoiceDiagnostics;
  diagnosticsRef: React.RefObject<VoiceDiagnostics>;
  patchDiagnostics: (patch: Partial<VoiceDiagnostics>) => void;
  patchMetrics: (patch: Partial<VoiceDiagnostics['metrics']>) => void;
  /** Mutable ref for mic RMS (written at audio callback frequency). */
  micRmsRef: React.MutableRefObject<number>;
  /** Mutable ref for playback RMS (written at audio callback frequency). */
  playbackRmsRef: React.MutableRefObject<number>;
  /** Start the rAF loop that flushes RMS refs into diagnostics state at ~15fps. */
  startRmsFlush: () => void;
  /** Stop the rAF flush loop. */
  stopRmsFlush: () => void;
}

export function useVoiceDiagnostics(): UseVoiceDiagnosticsReturn {
  const [diagnostics, setDiagnostics] = useState<VoiceDiagnostics>(initialDiagnostics);
  const diagnosticsRef = useRef<VoiceDiagnostics>(initialDiagnostics);

  const micRmsRef = useRef(0);
  const playbackRmsRef = useRef(0);
  const rmsFlushRafRef = useRef<number | null>(null);
  const rmsFlushActiveRef = useRef(false);

  const patchDiagnostics = useCallback((patch: Partial<VoiceDiagnostics>) => {
    setDiagnostics(prev => {
      const next = { ...prev, ...patch };
      diagnosticsRef.current = next;
      return next;
    });
  }, []);

  const patchMetrics = useCallback((patch: Partial<VoiceDiagnostics['metrics']>) => {
    setDiagnostics(prev => {
      const next = { ...prev, metrics: { ...prev.metrics, ...patch } };
      diagnosticsRef.current = next;
      return next;
    });
  }, []);

  /**
   * Start a throttled rAF loop that flushes micRms/playbackRms into state at ~15fps.
   * This avoids 60+ re-renders/sec from raw audio callbacks while keeping
   * barge-in detection (which reads micRmsRef directly) at full frequency.
   */
  const startRmsFlush = useCallback(() => {
    if (rmsFlushActiveRef.current) return;
    rmsFlushActiveRef.current = true;
    let lastFlush = 0;
    const RMS_FLUSH_INTERVAL_MS = 67; // ~15fps
    const loop = () => {
      if (!rmsFlushActiveRef.current) return;
      const now = performance.now();
      if (now - lastFlush >= RMS_FLUSH_INTERVAL_MS) {
        lastFlush = now;
        patchDiagnostics({ micRms: micRmsRef.current, playbackRms: playbackRmsRef.current });
      }
      rmsFlushRafRef.current = requestAnimationFrame(loop);
    };
    rmsFlushRafRef.current = requestAnimationFrame(loop);
  }, [patchDiagnostics]);

  const stopRmsFlush = useCallback(() => {
    rmsFlushActiveRef.current = false;
    if (rmsFlushRafRef.current !== null) {
      cancelAnimationFrame(rmsFlushRafRef.current);
      rmsFlushRafRef.current = null;
    }
  }, []);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      stopRmsFlush();
    };
  }, [stopRmsFlush]);

  return {
    diagnostics,
    diagnosticsRef,
    patchDiagnostics,
    patchMetrics,
    micRmsRef,
    playbackRmsRef,
    startRmsFlush,
    stopRmsFlush,
  };
}

export { initialDiagnostics };
