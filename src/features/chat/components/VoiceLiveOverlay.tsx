import React, { useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PhoneOff } from 'lucide-react';
import type { GeminiLiveState, VoiceDiagnostics } from '@/hooks/useGeminiLive';

interface VoiceLiveOverlayProps {
  liveState: GeminiLiveState;
  userTranscript: string;
  assistantTranscript: string;
  diagnostics: VoiceDiagnostics;
  onEndSession: () => void;
  tripName?: string;
}

/** Map live state to a human-readable label */
function stateLabel(state: GeminiLiveState): string {
  switch (state) {
    case 'requesting_mic':
      return 'Connecting…';
    case 'ready':
      return 'Ready';
    case 'listening':
      return 'Listening…';
    case 'sending':
      return 'Thinking…';
    case 'playing':
      return 'Speaking…';
    case 'interrupted':
      return 'Listening…';
    case 'error':
      return 'Error';
    default:
      return '';
  }
}

/** Determine orb visual mode from state */
type OrbMode = 'connecting' | 'listening' | 'speaking' | 'thinking';

function getOrbMode(state: GeminiLiveState): OrbMode {
  switch (state) {
    case 'requesting_mic':
    case 'ready':
      return 'connecting';
    case 'listening':
    case 'interrupted':
      return 'listening';
    case 'playing':
      return 'speaking';
    case 'sending':
      return 'thinking';
    default:
      return 'connecting';
  }
}

/**
 * VoiceLiveOverlay — Full-screen immersive voice conversation UI.
 *
 * Renders a portal overlay with a slow-breathing animated orb that responds
 * to mic and playback audio levels. Assistant transcript above the orb,
 * user (live STT) transcript below, with an end-call button at the bottom.
 *
 * Animation: pure CSS keyframes (4-5s cycles) + rAF for RMS-driven glow.
 * No new libraries — Tailwind + inline styles only.
 */
export function VoiceLiveOverlay({
  liveState,
  userTranscript,
  assistantTranscript,
  diagnostics,
  onEndSession,
  tripName,
}: VoiceLiveOverlayProps) {
  const orbRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const assistantScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll assistant transcript to bottom
  useEffect(() => {
    if (assistantScrollRef.current) {
      assistantScrollRef.current.scrollTop = assistantScrollRef.current.scrollHeight;
    }
  }, [assistantTranscript]);

  // rAF loop: read RMS values and set CSS custom properties on the orb
  const animateOrb = useCallback(() => {
    const orb = orbRef.current;
    if (!orb) {
      rafRef.current = requestAnimationFrame(animateOrb);
      return;
    }

    const mode = getOrbMode(liveState);
    const micRms = diagnostics.micRms || 0;
    const playbackRms = diagnostics.playbackRms || 0;

    // Dampen RMS influence — multiply by 0.4 for subtle effect
    let rmsScale = 0;
    let glowIntensity = 0;

    if (mode === 'listening') {
      rmsScale = micRms * 0.4;
      glowIntensity = micRms * 0.5;
    } else if (mode === 'speaking') {
      rmsScale = playbackRms * 0.3;
      glowIntensity = playbackRms * 0.4;
    }

    // Clamp to small range: base scale 1.0 ± 0.05 from RMS
    const scale = 1.0 + Math.min(rmsScale, 0.05);
    orb.style.setProperty('--orb-rms-scale', scale.toFixed(4));
    orb.style.setProperty('--orb-glow', Math.min(glowIntensity, 0.6).toFixed(4));

    rafRef.current = requestAnimationFrame(animateOrb);
  }, [liveState, diagnostics.micRms, diagnostics.playbackRms]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animateOrb);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animateOrb]);

  const orbMode = getOrbMode(liveState);

  const overlay = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center bg-black/95 backdrop-blur-xl"
      style={{ touchAction: 'none' }}
    >
      {/* Trip name badge */}
      {tripName && (
        <div className="mt-safe-top pt-4 pb-2 px-4 text-center">
          <span className="text-xs font-medium tracking-wide text-white/40 uppercase">
            {tripName}
          </span>
        </div>
      )}

      {/* Assistant transcript — above the orb, scrollable */}
      <div
        ref={assistantScrollRef}
        className="flex-1 w-full max-w-md px-6 overflow-y-auto flex flex-col justify-end"
        style={{ minHeight: 0 }}
      >
        {assistantTranscript ? (
          <p className="text-white/90 text-base leading-relaxed text-center whitespace-pre-wrap">
            {assistantTranscript}
          </p>
        ) : (
          <div />
        )}
      </div>

      {/* Orb container */}
      <div className="flex-shrink-0 flex flex-col items-center py-6">
        <div
          ref={orbRef}
          className={`
            relative w-32 h-32 rounded-full
            transition-transform duration-200 ease-out
            ${orbMode === 'connecting' ? 'animate-[orb-breathe_4s_ease-in-out_infinite]' : ''}
            ${orbMode === 'thinking' ? 'animate-[orb-breathe_5s_ease-in-out_infinite]' : ''}
          `}
          style={{
            ['--orb-rms-scale' as string]: '1',
            ['--orb-glow' as string]: '0',
            transform: `scale(calc(var(--orb-rms-scale) * 1))`,
          }}
        >
          {/* Base orb gradient */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                orbMode === 'speaking'
                  ? 'radial-gradient(circle at 40% 35%, #e0e7ff, #818cf8 50%, #4338ca 100%)'
                  : 'radial-gradient(circle at 40% 35%, #fef3c7, #f59e0b 50%, #b45309 100%)',
              opacity: orbMode === 'thinking' ? 0.7 : 0.9,
            }}
          />
          {/* Glow ring — driven by RMS */}
          <div
            className="absolute -inset-3 rounded-full transition-opacity duration-300"
            style={{
              background:
                orbMode === 'speaking'
                  ? 'radial-gradient(circle, rgba(129,140,248,0.3) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(245,158,11,0.35) 0%, transparent 70%)',
              opacity: `calc(0.3 + var(--orb-glow))`,
              filter: 'blur(12px)',
            }}
          />
          {/* Inner highlight */}
          <div
            className="absolute inset-4 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.4), transparent 60%)',
            }}
          />
        </div>

        {/* State label below orb */}
        <p className="mt-4 text-sm font-medium text-white/50 tracking-wide">
          {stateLabel(liveState)}
        </p>
      </div>

      {/* User transcript — below state label, gold text (live STT readout) */}
      <div className="flex-shrink-0 w-full max-w-md px-6 pb-4 min-h-[3rem]">
        {userTranscript ? (
          <p className="text-amber-400/80 text-sm leading-relaxed text-center whitespace-pre-wrap">
            {userTranscript}
          </p>
        ) : (
          orbMode === 'listening' && (
            <p className="text-white/20 text-sm text-center italic">Speak now…</p>
          )
        )}
      </div>

      {/* Diagnostics substep */}
      {diagnostics.substep && (
        <p className="text-xs text-white/30 text-center pb-2">{diagnostics.substep}</p>
      )}

      {/* End call button */}
      <div className="flex-shrink-0 pb-safe-bottom pb-8">
        <button
          type="button"
          onClick={onEndSession}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all duration-150 flex items-center justify-center shadow-lg shadow-red-900/40"
          aria-label="End voice session"
        >
          <PhoneOff size={24} className="text-white" />
        </button>
      </div>

      {/* CSS keyframes for orb breathing */}
      <style>{`
        @keyframes orb-breathe {
          0%, 100% { transform: scale(0.95); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );

  return createPortal(overlay, document.body);
}
