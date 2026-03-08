import React from 'react';
import { X, RefreshCw } from 'lucide-react';
import type { GeminiLiveState, VoiceDiagnostics } from '@/hooks/useGeminiLive';

interface VoiceActiveBarProps {
  state: GeminiLiveState;
  error: string | null;
  circuitBreakerOpen: boolean;
  onEnd: () => void;
  onResetCircuitBreaker: () => void;
  onReconnect?: () => void;
  diagnostics?: VoiceDiagnostics;
}

const STATE_LABEL: Record<GeminiLiveState, string> = {
  idle: '',
  requesting_mic: 'Connecting…',
  ready: 'Listening',
  listening: 'Listening',
  sending: 'Thinking…',
  playing: 'Speaking',
  interrupted: 'Listening',
  error: 'Error',
};

/**
 * Compact inline voice bar — replaces the full-screen overlay.
 * Sits at the top of the chat area showing voice state + controls.
 * Transcripts appear as normal chat bubbles below (via streamingVoiceMessage).
 */
export function VoiceActiveBar({
  state,
  error,
  circuitBreakerOpen,
  onEnd,
  onResetCircuitBreaker,
  onReconnect,
  diagnostics,
}: VoiceActiveBarProps) {
  const isListening = state === 'listening' || state === 'interrupted' || state === 'ready';
  const isSpeaking = state === 'playing';
  const isConnecting = state === 'requesting_mic';
  const isThinking = state === 'sending';
  const isError = state === 'error' || circuitBreakerOpen;

  const substep = diagnostics?.substep;
  const label = isError ? error || 'Connection failed' : substep || STATE_LABEL[state];

  const dotColor = isError
    ? 'bg-red-500'
    : isListening
      ? 'bg-emerald-500'
      : isSpeaking
        ? 'bg-blue-500'
        : isThinking
          ? 'bg-amber-400'
          : 'bg-white/40';

  const barBg = isError
    ? 'bg-red-500/10 border-red-500/20'
    : isSpeaking
      ? 'bg-blue-500/10 border-blue-500/20'
      : isListening
        ? 'bg-emerald-500/10 border-emerald-500/20'
        : 'bg-white/5 border-white/10';

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 mx-3 mt-2 rounded-xl border ${barBg} transition-colors duration-300`}
      role="status"
      aria-label={`Voice: ${label}`}
    >
      {/* LIVE dot */}
      <span className="flex items-center gap-2 min-w-0 flex-1">
        <span className="relative flex items-center justify-center shrink-0">
          <span
            className={`size-2.5 rounded-full ${dotColor} ${
              isConnecting || isThinking ? 'animate-pulse' : ''
            }`}
          />
          {(isListening || isSpeaking) && (
            <span className={`absolute inset-0 rounded-full ${dotColor} opacity-40 animate-ping`} />
          )}
        </span>
        <span className="text-xs text-white/70 truncate">{label}</span>
      </span>

      {/* Error recovery buttons */}
      {isError && !circuitBreakerOpen && onReconnect && (
        <button
          type="button"
          onClick={onReconnect}
          className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-white text-[11px] shrink-0 touch-manipulation"
        >
          <RefreshCw size={10} />
          Retry
        </button>
      )}
      {circuitBreakerOpen && (
        <button
          type="button"
          onClick={onResetCircuitBreaker}
          className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-white text-[11px] shrink-0 touch-manipulation"
        >
          <RefreshCw size={10} />
          Try again
        </button>
      )}

      {/* End session */}
      <button
        type="button"
        onClick={onEnd}
        className="size-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 active:scale-95 transition-all shrink-0 touch-manipulation"
        aria-label="End voice session"
      >
        <X size={12} className="text-white/70" />
      </button>
    </div>
  );
}
