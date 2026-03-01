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
}

const STATE_LABELS: Record<GeminiLiveState, string> = {
  idle: '',
  requesting_mic: 'Connecting...',
  ready: 'Connected',
  listening: 'Listening...',
  sending: 'Thinking...',
  playing: 'Speaking...',
  interrupted: 'Listening...',
  error: 'Error',
};

/**
 * Inline voice banner for Gemini Live bidirectional voice sessions.
 * Sits above the chat input — chat messages remain visible and scrollable.
 * Compact orb + status + live transcript + end button.
 * Like ChatGPT / Grok voice mode: you see both the conversation and the voice UI.
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

  return (
    <div
      className="w-full border-t border-white/10 bg-gradient-to-b from-black/60 to-black/40 backdrop-blur-md flex-shrink-0 animate-in slide-in-from-bottom-2 duration-200"
      role="region"
      aria-label="Voice conversation active"
    >
      {/* Top row: orb + status + end button */}
      <div className="flex items-center gap-3 px-3 py-2">
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
                    : state === 'error'
                      ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/30'
                      : 'bg-gradient-to-br from-neutral-600 to-neutral-700'
            }`}
          >
            {state === 'error' || circuitBreakerOpen ? (
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

        {/* Status text + live transcript preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold tracking-wide uppercase text-blue-400">
              Live
            </span>
            <span className="text-xs text-white/50">{STATE_LABELS[state]}</span>
          </div>
          {/* Streaming transcript preview — single line, truncated */}
          {(assistantTranscript || userTranscript) && (
            <p className="text-xs text-white/70 truncate mt-0.5 leading-snug">
              {assistantTranscript || (userTranscript ? `"${userTranscript}"` : '')}
            </p>
          )}
          {error && <p className="text-xs text-red-400 truncate mt-0.5">{error}</p>}
        </div>

        {/* Circuit breaker retry */}
        {circuitBreakerOpen && (
          <button
            type="button"
            onClick={onResetCircuitBreaker}
            className="flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-full bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-white text-xs touch-manipulation shrink-0"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        )}

        {/* End session button */}
        <button
          type="button"
          onClick={onEnd}
          className="size-9 min-h-[44px] min-w-[44px] rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center hover:bg-red-500/25 active:scale-95 transition-all touch-manipulation shrink-0"
          aria-label="End voice session"
        >
          <X size={16} className="text-red-400" />
        </button>
      </div>

      {/* Expanded transcript area — shows when there's content, scrollable */}
      {(assistantTranscript || userTranscript) && (
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
