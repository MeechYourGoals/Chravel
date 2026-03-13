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
 * Replaces the old fullscreen VoiceLiveOverlay. Renders a premium horizontal
 * gold gradient bar with AI transcript above (white) and user transcript below (gold).
 * Slow, elegant animation with RMS-responsive glow.
 */
export function VoiceLiveInline({
  liveState,
  userTranscript,
  assistantTranscript,
  diagnostics,
  onEndSession,
}: VoiceLiveInlineProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const assistantScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll assistant transcript to bottom
  useEffect(() => {
    if (assistantScrollRef.current) {
      assistantScrollRef.current.scrollTop = assistantScrollRef.current.scrollHeight;
    }
  }, [assistantTranscript]);

  // rAF loop: read RMS values and set CSS custom properties on the bar
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
    <div className="flex flex-col items-center justify-center flex-1 min-h-0 px-4 py-6 select-none">
      {/* AI transcript — above bar, scrollable, bright white */}
      <div
        ref={assistantScrollRef}
        className="flex-1 w-full max-w-lg overflow-y-auto flex flex-col justify-end min-h-0 mb-4"
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

      {/* Gold gradient bar — centerpiece */}
      <div className="w-full max-w-lg flex-shrink-0">
        <div
          ref={barRef}
          className={`
            relative w-full h-2 rounded-full overflow-hidden
            ${barMode === 'connecting' || barMode === 'thinking' ? 'animate-[bar-shimmer_8s_linear_infinite]' : 'animate-[bar-glow-pulse_6s_ease-in-out_infinite]'}
          `}
          style={{
            ['--bar-glow' as string]: '0',
            background: 'linear-gradient(90deg, #92400e, #d97706, #fbbf24, #d97706, #92400e)',
            backgroundSize: '200% 100%',
            boxShadow: `0 0 calc(8px + 20px * var(--bar-glow)) rgba(251, 191, 36, calc(0.3 + var(--bar-glow) * 0.5)),
                         0 0 calc(2px + 8px * var(--bar-glow)) rgba(245, 158, 11, calc(0.2 + var(--bar-glow) * 0.4))`,
          }}
        />

        {/* State label */}
        <p className="mt-3 text-xs font-medium text-white/40 tracking-wide text-center">
          {stateLabel(liveState)}
        </p>
      </div>

      {/* User transcript — below bar, premium gold */}
      <div className="flex-shrink-0 w-full max-w-lg mt-4 min-h-[2.5rem]">
        {userTranscript ? (
          <p className="text-amber-400/90 text-sm leading-relaxed text-center whitespace-pre-wrap">
            {userTranscript}
          </p>
        ) : (
          barMode === 'listening' && (
            <p className="text-amber-400/25 text-sm text-center italic">Speak now\u2026</p>
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

      {/* CSS keyframes */}
      <style>{`
        @keyframes bar-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes bar-glow-pulse {
          0%, 100% {
            transform: scaleX(1);
            opacity: 0.85;
          }
          50% {
            transform: scaleX(1.02);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
