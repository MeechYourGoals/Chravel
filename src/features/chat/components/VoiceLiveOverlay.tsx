import React, { useEffect, useRef } from 'react';
import { X, Mic, AlertCircle, RefreshCw, AudioLines } from 'lucide-react';
import type { GeminiLiveState } from '@/hooks/useGeminiLive';

interface VoiceLiveOverlayProps {
  state: GeminiLiveState;
  userTranscript: string;
  assistantTranscript: string;
  error: string | null;
  circuitBreakerOpen: boolean;
  onEnd: () => void;
  onResetCircuitBreaker: () => void;
  /** Called to close the error overlay and immediately restart a fresh voice session. */
  onReconnect?: () => void;
}

const STATE_LABEL: Record<GeminiLiveState, string> = {
  idle: '',
  requesting_mic: 'Connecting',
  ready: 'Connected',
  listening: 'Listening',
  sending: 'Thinking',
  playing: 'Speaking',
  interrupted: 'Listening',
  error: 'Error',
};

const STATE_DETAIL: Record<GeminiLiveState, string> = {
  idle: '',
  requesting_mic: 'Establishing voice session\u2026',
  ready: 'Speak now',
  listening: 'Speak now',
  sending: 'Processing\u2026',
  playing: 'AI is speaking',
  interrupted: 'Speak now',
  error: '',
};

/**
 * Inline voice banner for Gemini Live bidirectional voice sessions.
 * Sits above the chat input — chat messages remain visible and scrollable.
 * Single-line status: "Status • Detail". Close X is on the LEFT (above waveform button).
 */
export function VoiceLiveOverlay({
  state,
  userTranscript,
  assistantTranscript,
  error,
  circuitBreakerOpen,
  onEnd,
  onResetCircuitBreaker,
  onReconnect,
}: VoiceLiveOverlayProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript as it streams in
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [assistantTranscript, userTranscript]);

  const isActive = state !== 'idle' && state !== 'error';
  const isListening = state === 'listening' || state === 'interrupted' || state === 'ready';
  const isSpeaking = state === 'playing';
  const isThinking = state === 'sending' || state === 'requesting_mic';
  const isError = state === 'error' || circuitBreakerOpen;

  const statusLabel = STATE_LABEL[state];
  const statusDetail = isError
    ? error || 'Voice connection failed. Tap to retry.'
    : STATE_DETAIL[state];

  return (
    <div
      className="w-full border-t border-white/10 bg-gradient-to-b from-black/60 to-black/40 backdrop-blur-md flex-shrink-0 animate-in slide-in-from-bottom-2 duration-200"
      role="region"
      aria-label="Voice conversation active"
    >
      {/* Top row: close X (left, above waveform) + orb + status + retry */}
      <div className="flex items-center gap-3 px-3 py-2">
        {/* End session button — LEFT side, aligned above VoiceButton */}
        <button
          type="button"
          onClick={onEnd}
          className="size-9 min-h-[44px] min-w-[44px] rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center hover:bg-red-500/25 active:scale-95 transition-all touch-manipulation shrink-0"
          aria-label="End voice session"
        >
          <X size={16} className="text-red-400" />
        </button>

        {/* Mini orb with state-based animations */}
        <div className="relative flex items-center justify-center shrink-0">
          {/* Pulse rings */}
          {isListening && (
            <>
              <span
                aria-hidden
                className="absolute w-10 h-10 rounded-full bg-emerald-500/20 animate-[voice-pulse_2s_ease-out_infinite]"
              />
              <span
                aria-hidden
                className="absolute w-10 h-10 rounded-full bg-emerald-500/10 animate-[voice-pulse_2s_ease-out_0.6s_infinite]"
              />
            </>
          )}
          {isSpeaking && (
            <>
              <span
                aria-hidden
                className="absolute w-10 h-10 rounded-full bg-blue-500/20 animate-[voice-pulse_1.5s_ease-out_infinite]"
              />
              <span
                aria-hidden
                className="absolute w-10 h-10 rounded-full bg-cyan-500/10 animate-[voice-pulse_1.5s_ease-out_0.5s_infinite]"
              />
            </>
          )}
          {isThinking && (
            <span
              aria-hidden
              className="absolute w-10 h-10 rounded-full border border-amber-400/30 animate-spin"
              style={{ animationDuration: '3s' }}
            />
          )}

          {/* Core orb — 36px */}
          <div
            className={`relative size-9 rounded-full flex items-center justify-center transition-all duration-500 ${
              isListening
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/30'
                : isSpeaking
                  ? 'bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md shadow-blue-500/30'
                  : isThinking
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/30'
                    : isError
                      ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/30'
                      : 'bg-gradient-to-br from-neutral-600 to-neutral-700'
            }`}
          >
            {isError ? (
              <AlertCircle size={16} className="text-white" />
            ) : isSpeaking ? (
              <AudioLines size={16} className="text-white" />
            ) : (
              <Mic
                size={16}
                className={`text-white transition-opacity ${isActive ? 'opacity-100' : 'opacity-50'}`}
              />
            )}
          </div>
        </div>

        {/* Single-line status: "Status • Detail" */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span
              className={`text-xs font-semibold shrink-0 ${
                isError
                  ? 'text-red-400'
                  : isListening
                    ? 'text-emerald-400'
                    : isSpeaking
                      ? 'text-blue-400'
                      : isThinking
                        ? 'text-amber-400'
                        : 'text-white/60'
              }`}
            >
              {statusLabel}
            </span>
            {statusDetail && (
              <>
                <span className="text-white/25 text-xs shrink-0">&bull;</span>
                <span className="text-xs text-white/50 truncate">{statusDetail}</span>
              </>
            )}
          </div>
          {/* Streaming transcript preview — single line, truncated */}
          {(assistantTranscript || userTranscript) && !isError && (
            <p className="text-xs text-white/70 truncate mt-0.5 leading-snug">
              {assistantTranscript || (userTranscript ? `\u201c${userTranscript}\u201d` : '')}
            </p>
          )}
        </div>

        {/* Single-failure reconnect: error state but circuit breaker not yet open */}
        {state === 'error' && !circuitBreakerOpen && onReconnect && (
          <button
            type="button"
            onClick={onReconnect}
            className="flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-full bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-white text-xs touch-manipulation shrink-0"
            aria-label="Reconnect voice"
          >
            <RefreshCw size={12} />
            Reconnect
          </button>
        )}

        {/* Circuit breaker retry — shown after N consecutive failures */}
        {circuitBreakerOpen && (
          <button
            type="button"
            onClick={onResetCircuitBreaker}
            className="flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-full bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-white text-xs touch-manipulation shrink-0"
            aria-label="Reset circuit breaker and retry voice"
          >
            <RefreshCw size={12} />
            Try again
          </button>
        )}
      </div>

      {/* Expanded transcript area — shows when there's content, scrollable */}
      {(assistantTranscript || userTranscript) && !isError && (
        <div ref={transcriptRef} className="max-h-24 overflow-y-auto px-3 pb-2 scrollbar-none">
          {userTranscript && (
            <p className="text-xs text-white/50 italic leading-relaxed">
              &ldquo;{userTranscript}&rdquo;
            </p>
          )}
          {assistantTranscript && (
            <p className="text-sm text-white/85 leading-relaxed mt-1">{assistantTranscript}</p>
          )}
        </div>
      )}
    </div>
  );
}
