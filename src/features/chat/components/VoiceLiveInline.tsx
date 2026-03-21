import React, { useRef, useEffect, useCallback } from 'react';
import { PhoneOff, RotateCcw, Mic, AlertTriangle, Loader2, WifiOff } from 'lucide-react';
import type { GeminiLiveState, VoiceDiagnostics } from '@/hooks/useGeminiLive';

interface VoiceLiveInlineProps {
  liveState: GeminiLiveState;
  userTranscript: string;
  assistantTranscript: string;
  diagnostics: VoiceDiagnostics;
  error: string | null;
  circuitBreakerOpen: boolean;
  conversationEmpty: boolean;
  onEndSession: () => void;
  onRetry: () => void;
  onResetCircuitBreaker: () => void;
}

function stateLabel(state: GeminiLiveState, substep: string | null): string {
  switch (state) {
    case 'requesting_mic':
      return substep || 'Connecting\u2026';
    case 'reconnecting':
      return substep || 'Reconnecting\u2026';
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

type BarMode = 'connecting' | 'listening' | 'speaking' | 'thinking' | 'error';

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
    case 'error':
      return 'error';
    default:
      return 'connecting';
  }
}

/** Clamp and normalize an RMS value (0..1) for display as a percentage bar width. */
function rmsToPercent(rms: number): number {
  return Math.min(Math.max(rms * 3, 0), 1) * 100;
}

/**
 * VoiceLiveInline — Inline live voice UI rendered inside the concierge chat area.
 *
 * Renders a premium gold waveform with AI transcript above (white) and user
 * transcript below (gold). Subtle animation with RMS-responsive glow.
 * Includes error recovery UI, circuit breaker state, audio level indicator,
 * and accessibility annotations.
 */
export function VoiceLiveInline({
  liveState,
  userTranscript,
  assistantTranscript,
  diagnostics,
  error,
  circuitBreakerOpen,
  conversationEmpty,
  onEndSession,
  onRetry,
  onResetCircuitBreaker,
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
  const isMicPermissionDenied = error?.toLowerCase().includes('microphone permission denied');
  const isReconnecting = liveState === 'reconnecting';

  return (
    <div
      className="flex flex-col items-center flex-1 min-h-0 px-4 pb-4 pt-2 select-none"
      role="region"
      aria-label="Live voice session"
    >
      {/* Circuit breaker open — service temporarily unavailable */}
      {circuitBreakerOpen && (
        <div className="w-full max-w-[90%] sm:max-w-2xl mb-4 p-4 rounded-xl bg-amber-900/20 border border-amber-500/20 text-center">
          <WifiOff size={24} className="mx-auto mb-2 text-amber-400" aria-hidden="true" />
          <p className="text-amber-300 text-sm font-medium mb-1">Voice temporarily unavailable</p>
          <p className="text-amber-400/60 text-xs mb-3">
            Multiple connection failures detected. The service may be experiencing issues.
          </p>
          <button
            type="button"
            onClick={onResetCircuitBreaker}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium hover:bg-amber-500/30 active:scale-95 transition-all min-h-[44px] min-w-[44px] touch-manipulation"
            aria-label="Try voice again"
          >
            <RotateCcw size={14} aria-hidden="true" />
            Try voice again
          </button>
        </div>
      )}

      {/* Error state with recovery */}
      {liveState === 'error' && error && !circuitBreakerOpen && (
        <div className="w-full max-w-[90%] sm:max-w-2xl mb-4 p-4 rounded-xl bg-red-900/20 border border-red-500/20 text-center">
          <AlertTriangle size={24} className="mx-auto mb-2 text-red-400" aria-hidden="true" />
          <p className="text-red-300 text-sm font-medium mb-1">
            {isMicPermissionDenied ? 'Microphone permission needed' : 'Voice session error'}
          </p>
          <p className="text-red-400/70 text-xs mb-3 max-w-sm mx-auto">
            {isMicPermissionDenied
              ? 'Allow microphone access in your browser settings, then tap retry.'
              : error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/30 active:scale-95 transition-all min-h-[44px] min-w-[44px] touch-manipulation"
            aria-label="Retry voice session"
          >
            <RotateCcw size={14} aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {/* AI transcript — above bar, scrollable, bright white */}
      <div
        ref={assistantScrollRef}
        className="flex-1 w-full max-w-[90%] sm:max-w-2xl overflow-y-auto flex flex-col justify-end min-h-0 mb-4"
        role="log"
        aria-label="Assistant speech"
        aria-live="polite"
      >
        {assistantTranscript ? (
          <p className="text-white/90 text-base leading-relaxed text-center whitespace-pre-wrap">
            {assistantTranscript}
          </p>
        ) : conversationEmpty && barMode === 'listening' ? (
          <div className="text-center space-y-2">
            <Mic size={20} className="mx-auto text-white/20" aria-hidden="true" />
            <p className="text-white/30 text-sm">Ask your concierge anything about this trip</p>
            <p className="text-white/15 text-xs">
              Try: &ldquo;What&rsquo;s on our schedule today?&rdquo;
            </p>
          </div>
        ) : barMode === 'connecting' ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin text-white/30" aria-hidden="true" />
            <p className="text-white/25 text-sm text-center italic">
              {diagnostics.substep || 'Setting up voice\u2026'}
            </p>
          </div>
        ) : null}
      </div>

      {/* Gold waveform divider — full width of live content area */}
      <div className="w-full flex-shrink-0">
        <svg
          ref={barRef}
          className={`w-full ${barMode === 'connecting' || barMode === 'thinking' ? 'animate-[wave-breathe_3s_ease-in-out_infinite]' : ''}`}
          viewBox="0 0 200 20"
          height="24"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Voice waveform - ${stateLabel(liveState, null)}`}
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

        {/* Audio level indicator — thin bar below waveform */}
        {(barMode === 'listening' || barMode === 'speaking') && (
          <div
            className="mt-1.5 h-0.5 rounded-full bg-white/5 overflow-hidden"
            role="meter"
            aria-label={barMode === 'listening' ? 'Microphone level' : 'Playback level'}
            aria-valuenow={Math.round(
              barMode === 'listening'
                ? rmsToPercent(diagnostics.micRms)
                : rmsToPercent(diagnostics.playbackRms),
            )}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-75 ${
                barMode === 'listening'
                  ? 'bg-gradient-to-r from-amber-500/40 to-amber-400/60'
                  : 'bg-gradient-to-r from-white/30 to-white/50'
              }`}
              style={{
                width: `${barMode === 'listening' ? rmsToPercent(diagnostics.micRms) : rmsToPercent(diagnostics.playbackRms)}%`,
              }}
            />
          </div>
        )}

        {/* State label */}
        <p
          className="mt-3 text-xs font-medium text-white/40 tracking-wide text-center"
          role="status"
          aria-live="polite"
        >
          {isReconnecting && diagnostics.reconnectAttempts > 0
            ? `Reconnecting\u2026 (attempt ${diagnostics.reconnectAttempts})`
            : stateLabel(liveState, diagnostics.substep)}
        </p>
      </div>

      {/* Bottom half — user transcript + end button */}
      <div className="flex-1 min-h-0 flex flex-col w-full">
        {/* User transcript — below bar, premium gold */}
        <div
          className="flex-1 w-full max-w-[90%] sm:max-w-2xl mt-4 min-h-[2.5rem] mx-auto"
          role="log"
          aria-label="Your speech"
          aria-live="polite"
        >
          {userTranscript ? (
            <p className="text-amber-400/90 text-sm leading-relaxed text-center whitespace-pre-wrap">
              {userTranscript}
            </p>
          ) : (
            barMode === 'listening' && (
              <p className="text-amber-400/25 text-sm text-center italic">Speak now&hellip;</p>
            )
          )}
        </div>

        {/* End session button — pinned to lower-left, above dictation button */}
        <div className="flex-shrink-0 pb-1 pl-1">
          <button
            type="button"
            onClick={onEndSession}
            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all duration-150 flex items-center justify-center shadow-lg shadow-red-900/40 touch-manipulation"
            aria-label="End voice session"
          >
            <PhoneOff size={18} className="text-white" aria-hidden="true" />
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
