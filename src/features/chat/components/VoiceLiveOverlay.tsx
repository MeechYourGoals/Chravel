import React, { useEffect, useRef } from 'react';
import { X, Mic, AlertCircle, RefreshCw } from 'lucide-react';
import type { GeminiLiveState } from '@/hooks/useGeminiLive';

interface VoiceLiveOverlayProps {
  state: GeminiLiveState;
  userTranscript: string;
  assistantTranscript: string;
  error: string | null;
  circuitBreakerOpen: boolean;
  onEnd: () => void;
  onResetCircuitBreaker: () => void;
}

const STATE_LABELS: Record<GeminiLiveState, string> = {
  idle: '',
  requesting_mic: 'Starting microphone...',
  ready: 'Connected',
  listening: 'Listening...',
  sending: 'Thinking...',
  playing: 'Speaking...',
  interrupted: 'Listening...',
  error: 'Error',
};

/**
 * Full-screen overlay for Gemini Live bidirectional voice sessions.
 * Mobile-optimized with safe-area insets, minimum touch targets,
 * and responsive transcript sizing.
 */
export function VoiceLiveOverlay({
  state,
  userTranscript,
  assistantTranscript,
  error,
  circuitBreakerOpen,
  onEnd,
  onResetCircuitBreaker,
}: VoiceLiveOverlayProps) {
  const assistantScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll assistant transcript as it streams in
  useEffect(() => {
    if (assistantScrollRef.current) {
      assistantScrollRef.current.scrollTop = assistantScrollRef.current.scrollHeight;
    }
  }, [assistantTranscript]);

  const isActive = state !== 'idle' && state !== 'error';
  const isListening = state === 'listening' || state === 'interrupted' || state === 'ready';
  const isSpeaking = state === 'playing';
  const isThinking = state === 'sending' || state === 'requesting_mic';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 backdrop-blur-xl overscroll-none touch-none">
      {/* Header — status + close button */}
      <div
        className="w-full flex items-center justify-between px-4 pt-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50 font-medium tracking-wide uppercase">
            {STATE_LABELS[state] || 'Conversation'}
          </span>
        </div>
        <button
          type="button"
          onClick={onEnd}
          className="size-11 min-h-[44px] min-w-[44px] rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all touch-manipulation"
          aria-label="End voice session"
        >
          <X size={20} className="text-white" />
        </button>
      </div>

      {/* Center — animated orb + transcripts */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6 px-5 sm:px-6 max-w-lg w-full min-h-0">
        {/* Assistant transcript — scrollable area above the orb */}
        {assistantTranscript && (
          <div
            ref={assistantScrollRef}
            className="w-full max-h-[25vh] sm:max-h-32 overflow-y-auto text-center px-2 scrollbar-none"
          >
            <p className="text-white/90 text-base sm:text-lg leading-relaxed">
              {assistantTranscript}
            </p>
          </div>
        )}

        {/* Animated orb */}
        <div className="relative flex items-center justify-center">
          {/* Outer pulse rings */}
          {isListening && (
            <>
              <span
                aria-hidden
                className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-emerald-500/20 animate-[voice-pulse_2s_ease-out_infinite]"
              />
              <span
                aria-hidden
                className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-emerald-500/10 animate-[voice-pulse_2s_ease-out_0.6s_infinite]"
              />
            </>
          )}
          {isSpeaking && (
            <>
              <span
                aria-hidden
                className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-blue-500/20 animate-[voice-pulse_1.5s_ease-out_infinite]"
              />
              <span
                aria-hidden
                className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-cyan-500/10 animate-[voice-pulse_1.5s_ease-out_0.5s_infinite]"
              />
            </>
          )}
          {isThinking && (
            <span
              aria-hidden
              className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-amber-400/30 animate-spin"
              style={{ animationDuration: '3s' }}
            />
          )}

          {/* Core orb — 88px on mobile, 96px on larger screens */}
          <div
            className={`relative w-22 h-22 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
              isListening
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/40'
                : isSpeaking
                  ? 'bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/40'
                  : isThinking
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/40'
                    : state === 'error'
                      ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/40'
                      : 'bg-gradient-to-br from-neutral-600 to-neutral-700'
            }`}
            style={{ width: '5.5rem', height: '5.5rem' }}
          >
            {state === 'error' || circuitBreakerOpen ? (
              <AlertCircle size={30} className="text-white" />
            ) : (
              <Mic
                size={30}
                className={`text-white transition-opacity ${isActive ? 'opacity-100' : 'opacity-50'}`}
              />
            )}
          </div>
        </div>

        {/* User transcript */}
        {userTranscript && (
          <div className="w-full text-center px-2">
            <p className="text-white/60 text-sm leading-relaxed italic">
              &ldquo;{userTranscript}&rdquo;
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="w-full text-center px-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Circuit breaker retry */}
        {circuitBreakerOpen && (
          <button
            type="button"
            onClick={onResetCircuitBreaker}
            className="flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white text-sm touch-manipulation"
          >
            <RefreshCw size={14} />
            Try voice again
          </button>
        )}
      </div>

      {/* Footer — end session button */}
      <div
        className="w-full px-6 pb-6"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
      >
        <button
          type="button"
          onClick={onEnd}
          className="w-full py-3.5 min-h-[48px] rounded-full bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/30 active:scale-[0.98] transition-all touch-manipulation"
        >
          {isActive ? 'End Voice Session' : 'Close'}
        </button>
      </div>
    </div>
  );
}
