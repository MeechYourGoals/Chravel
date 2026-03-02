import React, { useEffect, useRef } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
 * Full-screen immersive voice overlay for Gemini Live bidirectional sessions.
 * Takes over the entire viewport — matching ChatGPT / Gemini Live patterns.
 * When dismissed, rich cards from the voice session are visible in chat history.
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

  const isListening = state === 'listening' || state === 'interrupted' || state === 'ready';
  const isSpeaking = state === 'playing';
  const isThinking = state === 'sending' || state === 'requesting_mic';
  const isError = state === 'error' || circuitBreakerOpen;

  const statusLabel = STATE_LABEL[state];
  const substep = diagnostics?.substep;
  const statusDetail = isError
    ? error || 'Voice connection failed. Tap Reconnect.'
    : substep || STATE_DETAIL[state];

  const errorDetail =
    isError && diagnostics?.wsCloseCode
      ? `${error || 'Connection failed'} (WS ${diagnostics.wsCloseCode})`
      : error || 'Voice connection failed. Tap Reconnect.';

  // Orb color based on state
  const orbColor = isError
    ? 'from-red-500/40 to-red-600/20'
    : isListening
      ? 'from-emerald-500/40 to-cyan-500/20'
      : isSpeaking
        ? 'from-blue-500/40 to-indigo-500/20'
        : isThinking
          ? 'from-blue-400/30 to-cyan-400/15'
          : 'from-white/10 to-white/5';

  const orbBorder = isError
    ? 'border-red-500/30'
    : isListening
      ? 'border-emerald-500/30'
      : isSpeaking
        ? 'border-blue-500/30'
        : 'border-white/10';

  const labelColor = isError
    ? 'text-red-400'
    : isListening
      ? 'text-emerald-400'
      : isSpeaking
        ? 'text-blue-400'
        : isThinking
          ? 'text-blue-400'
          : 'text-white/60';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-black via-black/95 to-black"
      role="dialog"
      aria-label="Voice conversation active"
      aria-modal="true"
    >
      {/* Top bar: LIVE badge + close button */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/25">
            <span className="size-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-red-400">
              LIVE
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={onEnd}
          className="size-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/15 active:scale-95 transition-all touch-manipulation"
          aria-label="End voice session"
        >
          <X size={18} className="text-white/80" />
        </button>
      </div>

      {/* Center: Pulsing orb + status */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {/* Animated orb */}
        <div className="relative">
          {/* Outer glow ring */}
          <motion.div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${orbColor} blur-xl`}
            animate={{
              scale: isListening ? [1, 1.2, 1] : isSpeaking ? [1, 1.15, 1.05, 1.2, 1] : 1,
              opacity: isListening ? [0.4, 0.7, 0.4] : isSpeaking ? [0.3, 0.6, 0.3] : 0.2,
            }}
            transition={{
              duration: isListening ? 2.5 : isSpeaking ? 1.5 : 0.3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ width: 160, height: 160, margin: -20 }}
          />
          {/* Inner orb */}
          <motion.div
            className={`relative size-[120px] rounded-full bg-gradient-to-br ${orbColor} border-2 ${orbBorder} backdrop-blur-sm flex items-center justify-center`}
            animate={{
              scale: isListening ? [1, 1.06, 1] : isSpeaking ? [1, 1.08, 1.03, 1.1, 1] : isThinking ? [1, 1.02, 1] : 1,
            }}
            transition={{
              duration: isListening ? 2.5 : isSpeaking ? 1.5 : isThinking ? 1.8 : 0.3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {/* Inner dot */}
            <motion.div
              className={`size-3 rounded-full ${isError ? 'bg-red-400' : isListening ? 'bg-emerald-400' : isSpeaking ? 'bg-blue-400' : 'bg-white/40'}`}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        </div>

        {/* Status label */}
        <div className="text-center">
          <p className={`text-lg font-semibold ${labelColor}`}>
            {statusLabel}
          </p>
          {statusDetail && (
            <p className="text-sm text-white/50 mt-1">
              {isError ? errorDetail : statusDetail}
            </p>
          )}
        </div>

        {/* Error action buttons */}
        {state === 'error' && !circuitBreakerOpen && onReconnect && (
          <button
            type="button"
            onClick={onReconnect}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-white text-sm touch-manipulation"
            aria-label="Reconnect voice"
          >
            <RefreshCw size={14} />
            Reconnect
          </button>
        )}
        {circuitBreakerOpen && (
          <button
            type="button"
            onClick={onResetCircuitBreaker}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-white text-sm touch-manipulation"
            aria-label="Reset circuit breaker and retry voice"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        )}
      </div>

      {/* Bottom: Transcript area */}
      <div className="px-6 pb-8" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 32px)' }}>
        <AnimatePresence mode="wait">
          {(assistantTranscript || userTranscript) && !isError && (
            <motion.div
              ref={transcriptRef}
              className="max-h-48 overflow-y-auto scrollbar-none"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              {userTranscript && (
                <p className="text-sm text-white/40 italic leading-relaxed text-center">
                  &ldquo;{userTranscript}&rdquo;
                </p>
              )}
              {assistantTranscript && (
                <p className="text-base text-white/85 leading-relaxed mt-2 text-center">
                  {assistantTranscript}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
