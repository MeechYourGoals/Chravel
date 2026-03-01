import React, { useEffect, useRef } from 'react';
import { X, RefreshCw } from 'lucide-react';
import type { GeminiLiveState, VoiceDiagnostics } from '@/hooks/useGeminiLive';

interface VoiceLiveOverlayProps {
  state: GeminiLiveState;
  userTranscript: string;
  assistantTranscript: string;
  error: string | null;
  circuitBreakerOpen: boolean;
  onEnd: () => void;
  onResetCircuitBreaker: () => void;
  onReconnect?: () => void;
  diagnostics?: VoiceDiagnostics;
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
 *
 * Layout: 2-column grid.
 *   Left (44px): Red X button centered above "Live" label.
 *   Right (flex-1): Status label + detail text, transcript preview.
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
  diagnostics,
}: VoiceLiveOverlayProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);

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
  // Use substep from diagnostics if available (incremental feedback)
  const substep = diagnostics?.substep;
  const statusDetail = isError
    ? error || 'Voice connection failed. Tap Reconnect.'
    : substep || STATE_DETAIL[state];

  // Show WS close code in error state for debugging
  const errorDetail = isError && diagnostics?.wsCloseCode
    ? `${error || 'Connection failed'} (WS ${diagnostics.wsCloseCode})`
    : error || 'Voice connection failed. Tap Reconnect.';

  return (
    <div
      className="w-full border-t border-white/10 bg-gradient-to-b from-black/60 to-black/40 backdrop-blur-md flex-shrink-0 animate-in slide-in-from-bottom-2 duration-200"
      style={{ minHeight: 52 }}
      role="region"
      aria-label="Voice conversation active"
    >
      {/* 2-column grid: left = close + Live label, right = status + actions */}
      <div className="grid items-center gap-3 px-3 py-2" style={{ gridTemplateColumns: '44px 1fr auto' }}>
        {/* Left column: Close button + Live label — centered, fixed 44px */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={onEnd}
            className="size-9 min-h-[36px] min-w-[36px] rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center hover:bg-red-500/25 active:scale-95 transition-all touch-manipulation"
            aria-label="End voice session"
          >
            <X size={16} className="text-red-400" />
          </button>
          <span className="text-[9px] font-bold tracking-widest uppercase text-red-400/80 select-none">
            Live
          </span>
        </div>

        {/* Center column: Status text — left-aligned, truncated */}
        <div className="min-w-0">
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
                        ? 'text-blue-400'
                        : 'text-white/60'
              }`}
            >
              {statusLabel}
            </span>
            {statusDetail && (
              <>
                <span className="text-white/25 text-xs shrink-0">&bull;</span>
                <span className="text-xs text-white/50 truncate">{isError ? errorDetail : statusDetail}</span>
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

        {/* Right column: Action buttons */}
        <div className="shrink-0">
          {/* Single-failure reconnect */}
          {state === 'error' && !circuitBreakerOpen && onReconnect && (
            <button
              type="button"
              onClick={onReconnect}
              className="flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-full bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-white text-xs touch-manipulation"
              aria-label="Reconnect voice"
            >
              <RefreshCw size={12} />
              Reconnect
            </button>
          )}

          {/* Circuit breaker retry */}
          {circuitBreakerOpen && (
            <button
              type="button"
              onClick={onResetCircuitBreaker}
              className="flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-full bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-white text-xs touch-manipulation"
              aria-label="Reset circuit breaker and retry voice"
            >
              <RefreshCw size={12} />
              Try again
            </button>
          )}
        </div>
      </div>

      {/* Expanded transcript area */}
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
