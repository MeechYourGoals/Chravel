import React, { useEffect, useRef } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  GeminiLiveState,
  VoiceDiagnostics,
  VoiceConversationTurn,
} from '@/hooks/useGeminiLive';

interface VoiceLiveOverlayProps {
  state: GeminiLiveState;
  userTranscript: string;
  assistantTranscript: string;
  conversationHistory: VoiceConversationTurn[];
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
  requesting_mic: 'Opening audio channel\u2026',
  ready: 'Speak now',
  listening: 'Speak now',
  sending: 'Processing\u2026',
  playing: 'AI is speaking',
  interrupted: 'Speak now',
  error: '',
};

/**
 * Full-screen immersive voice overlay — transcript-first design.
 * Like Claude voice / Grok voice: shows real-time text transcription of both
 * user speech and AI responses, with conversation history from the session.
 */
export function VoiceLiveOverlay({
  state,
  userTranscript,
  assistantTranscript,
  conversationHistory,
  error,
  circuitBreakerOpen,
  onEnd,
  onResetCircuitBreaker,
  onReconnect,
  diagnostics,
}: VoiceLiveOverlayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new transcript content arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory, assistantTranscript, userTranscript]);

  const isListening = state === 'listening' || state === 'interrupted' || state === 'ready';
  const isSpeaking = state === 'playing';
  const isConnecting = state === 'requesting_mic';
  const isThinking = state === 'sending';
  const isError = state === 'error' || circuitBreakerOpen;
  const isActive = isListening || isSpeaking || isThinking;

  const statusLabel = STATE_LABEL[state];
  const substep = diagnostics?.substep;
  const statusDetail = isError
    ? error || 'Voice connection failed. Tap Reconnect.'
    : substep || STATE_DETAIL[state];

  /* ── State indicator color ─────────────────────────────── */
  const dotColor = isError
    ? 'bg-red-500'
    : isListening
      ? 'bg-emerald-500'
      : isSpeaking
        ? 'bg-blue-500'
        : isThinking
          ? 'bg-amber-400'
          : 'bg-white/40';

  const labelColor = isError
    ? 'text-red-400'
    : isListening
      ? 'text-emerald-400'
      : isSpeaking
        ? 'text-blue-400'
        : isThinking
          ? 'text-amber-400'
          : 'text-white/60';

  const hasLiveContent = !!(userTranscript || assistantTranscript);
  const hasHistory = conversationHistory.length > 0;
  const showTranscripts = hasLiveContent || hasHistory;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-black via-black/95 to-black"
      role="dialog"
      aria-label="Voice conversation active"
      aria-modal="true"
    >
      {/* ── Top bar: LIVE badge + state indicator + close button ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/25">
            <span className="size-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-red-400">
              LIVE
            </span>
          </span>
          {statusLabel && (
            <div className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${dotColor} ${
                  isConnecting || isThinking ? 'animate-pulse' : ''
                }`}
              />
              <span className={`text-xs font-medium ${labelColor}`}>{statusLabel}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onEnd}
          className="size-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/15 active:scale-95 transition-all touch-manipulation"
          aria-label="End voice session"
        >
          <X size={16} className="text-white/80" />
        </button>
      </div>

      {/* ── Main content: transcript area ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-none px-5 pb-4">
        {/* Connecting / waiting state */}
        {(isConnecting || (!showTranscripts && !isActive && !isError)) && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${dotColor} animate-pulse`} />
              <span
                className={`size-2 rounded-full ${dotColor} animate-pulse`}
                style={{ animationDelay: '0.15s' }}
              />
              <span
                className={`size-2 rounded-full ${dotColor} animate-pulse`}
                style={{ animationDelay: '0.3s' }}
              />
            </div>
            <p className="text-sm text-white/50">{statusDetail}</p>
          </div>
        )}

        {/* Ready / listening — waiting for first speech (or proactive model speech) */}
        {isActive && !showTranscripts && !isConnecting && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span
              className={`size-3 rounded-full ${dotColor} ${isSpeaking ? 'animate-pulse' : ''}`}
            />
            <p className="text-base text-white/60">{statusDetail}</p>
          </div>
        )}

        {/* Error state */}
        {isError && !showTranscripts && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-sm text-red-400/80 text-center px-8 leading-relaxed">
              {error || 'Voice connection failed. Tap Reconnect.'}
            </p>
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
        )}

        {/* ── Conversation transcript ── */}
        {showTranscripts && (
          <div className="flex flex-col gap-5 py-4">
            {/* Past turns from conversation history */}
            {conversationHistory.map((turn, idx) => (
              <motion.div
                key={`history-${idx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={turn.role === 'user' ? 'self-end max-w-[85%]' : 'self-start max-w-[85%]'}
              >
                <p
                  className={
                    turn.role === 'user'
                      ? 'text-sm text-white/35 italic text-right leading-relaxed'
                      : 'text-sm text-white/50 leading-relaxed'
                  }
                >
                  {turn.text}
                </p>
              </motion.div>
            ))}

            {/* Current turn — live transcription */}
            <AnimatePresence mode="sync">
              {userTranscript && (
                <motion.div
                  key="live-user"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="self-end max-w-[85%]"
                >
                  <p className="text-base text-white/60 italic text-right leading-relaxed">
                    {userTranscript}
                    <span className="inline-block w-0.5 h-4 bg-white/40 ml-0.5 align-text-bottom animate-pulse" />
                  </p>
                </motion.div>
              )}
              {assistantTranscript && (
                <motion.div
                  key="live-assistant"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="self-start max-w-[85%]"
                >
                  <p className="text-base text-white/90 leading-relaxed">
                    {assistantTranscript}
                    {isSpeaking && (
                      <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 align-text-bottom animate-pulse" />
                    )}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Thinking indicator between user speech and AI response */}
            {isThinking && !assistantTranscript && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="self-start">
                <div className="flex items-center gap-1.5 py-1">
                  <span className="size-1.5 rounded-full bg-amber-400/60 animate-pulse" />
                  <span
                    className="size-1.5 rounded-full bg-amber-400/60 animate-pulse"
                    style={{ animationDelay: '0.15s' }}
                  />
                  <span
                    className="size-1.5 rounded-full bg-amber-400/60 animate-pulse"
                    style={{ animationDelay: '0.3s' }}
                  />
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom bar: state indicator + error recovery ── */}
      <div
        className="px-5 pb-4 flex flex-col items-center gap-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
      >
        {/* State detail when transcript is visible */}
        {showTranscripts && !isError && <p className={`text-xs ${labelColor}`}>{statusDetail}</p>}

        {/* Error buttons when transcript is visible */}
        {isError && showTranscripts && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-red-400/70">{error || 'Connection lost'}</p>
            {state === 'error' && !circuitBreakerOpen && onReconnect && (
              <button
                type="button"
                onClick={onReconnect}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-white text-xs touch-manipulation"
              >
                <RefreshCw size={12} />
                Reconnect
              </button>
            )}
            {circuitBreakerOpen && (
              <button
                type="button"
                onClick={onResetCircuitBreaker}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-white text-xs touch-manipulation"
              >
                <RefreshCw size={12} />
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
