import React, { useRef, useEffect, useCallback } from 'react';
import { PhoneOff } from 'lucide-react';
import type { GeminiLiveState, VoiceDiagnostics } from '@/hooks/useGeminiLive';

interface VoiceLiveInlineProps {
  liveState: GeminiLiveState;
  userTranscript: string;
  assistantTranscript: string;
  diagnostics: VoiceDiagnostics;
  onEndSession: () => void;
}

function stateLabel(state: GeminiLiveState): string {
  switch (state) {
    case 'requesting_mic':
      return 'Connecting\u2026';
    case 'reconnecting':
      return 'Reconnecting\u2026';
    case 'ready':
      return 'Ready';
    case 'listening':
      return 'Listening\u2026';
    case 'sending':
      return 'Thinking\u2026';
    case 'playing':
      return 'Speaking\u2026';
    case 'interrupted':
      return 'Listening\u2026';
    case 'error':
      return 'Error';
    default:
      return '';
  }
}

type BarMode = 'connecting' | 'listening' | 'speaking' | 'thinking';

function getBarMode(state: GeminiLiveState): BarMode {
  switch (state) {
    case 'requesting_mic':
    case 'reconnecting':
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
 * VoiceLiveInline — Inline live voice UI rendered inside the concierge chat area.
 *
 * Renders a premium gold waveform with AI transcript above (white) and user
 * transcript below (gold). Subtle animation with RMS-responsive glow.
 */
export function VoiceLiveInline({
  liveState,
  userTranscript,
  assistantTranscript,
  diagnostics,
  onEndSession,
}: VoiceLiveInlineProps) {
  const barRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number>(0);
  const assistantScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll assistant transcript to bottom
  useEffect(() => {
    if (assistantScrollRef.current) {
      assistantScrollRef.current.scrollTop = assistantScrollRef.current.scrollHeight;
    }
  }, [assistantTranscript]);

  // rAF loop: read RMS values and set CSS custom properties on the waveform
  const animateBar = useCallback(() => {
    const bar = barRef.current;
    if (!bar) {
      rafRef.current = requestAnimationFrame(animateBar);
      return;
    }

    const mode = getBarMode(liveState);
    const micRms = diagnostics.micRms || 0;
    const playbackRms = diagnostics.playbackRms || 0;

    let glowIntensity = 0;
    if (mode === 'listening') {
      glowIntensity = micRms * 0.6;
    } else if (mode === 'speaking') {
      glowIntensity = playbackRms * 0.5;
    }

    bar.style.setProperty('--bar-glow', Math.min(glowIntensity, 0.7).toFixed(4));
    rafRef.current = requestAnimationFrame(animateBar);
  }, [liveState, diagnostics.micRms, diagnostics.playbackRms]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animateBar);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animateBar]);

  const barMode = getBarMode(liveState);

  return (
    <div className="flex flex-col items-center flex-1 min-h-0 px-4 pb-4 pt-2 select-none">
      {/* AI transcript — above bar, scrollable, bright white */}
      <div
        ref={assistantScrollRef}
        className="flex-1 w-full max-w-[90%] sm:max-w-2xl overflow-y-auto flex flex-col justify-end min-h-0 mb-4"
      >
        {assistantTranscript ? (
          <p className="text-white/90 text-base leading-relaxed text-center whitespace-pre-wrap">
            {assistantTranscript}
          </p>
        ) : (
          barMode === 'connecting' && (
            <p className="text-white/25 text-sm text-center italic">
              {diagnostics.substep || 'Setting up voice\u2026'}
            </p>
          )
        )}
      </div>

      {/* Gold waveform — centerpiece */}
      <div className="w-full max-w-[90%] sm:max-w-2xl flex-shrink-0">
        <svg
          ref={barRef}
          className={`w-full ${barMode === 'connecting' || barMode === 'thinking' ? 'animate-[wave-breathe_3s_ease-in-out_infinite]' : ''}`}
          viewBox="0 0 200 20"
          height="24"
          preserveAspectRatio="none"
          style={{
            ['--bar-glow' as string]: '0',
            filter: `drop-shadow(0 0 calc(4px + 10px * var(--bar-glow)) rgba(196, 151, 70, calc(0.3 + var(--bar-glow) * 0.4)))
                     drop-shadow(0 0 calc(1px + 4px * var(--bar-glow)) rgba(254, 234, 165, calc(0.15 + var(--bar-glow) * 0.3)))`,
          }}
        >
          <defs>
            <linearGradient id="gold-wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#533517" />
              <stop offset="25%" stopColor="#c49746" />
              <stop offset="50%" stopColor="#feeaa5" />
              <stop offset="75%" stopColor="#c49746" />
              <stop offset="100%" stopColor="#533517" />
            </linearGradient>
          </defs>
          <path
            d="M 0 10 C 12.5 3, 25 3, 37.5 10 S 62.5 17, 75 10 S 100 3, 112.5 10 S 137.5 17, 150 10 S 175 3, 187.5 10 L 200 10"
            stroke="url(#gold-wave-grad)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        {/* State label */}
        <p className="mt-3 text-xs font-medium text-white/40 tracking-wide text-center">
          {stateLabel(liveState)}
        </p>
      </div>

      {/* Bottom half — mirrors top flex-1 for true vertical centering */}
      <div className="flex-1 min-h-0 flex flex-col items-center w-full">
        {/* User transcript — below bar, premium gold */}
        <div className="flex-shrink-0 w-full max-w-[90%] sm:max-w-2xl mt-4 min-h-[2.5rem]">
          {userTranscript ? (
            <p className="text-amber-400/90 text-sm leading-relaxed text-center whitespace-pre-wrap">
              {userTranscript}
            </p>
          ) : (
            barMode === 'listening' && (
              <p className="text-amber-400/25 text-sm text-center italic">Speak now…</p>
            )
          )}
        </div>

        {/* End session button */}
        <div className="flex-shrink-0 mt-4">
          <button
            type="button"
            onClick={onEndSession}
            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all duration-150 flex items-center justify-center shadow-lg shadow-red-900/40"
            aria-label="End voice session"
          >
            <PhoneOff size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes wave-breathe {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
