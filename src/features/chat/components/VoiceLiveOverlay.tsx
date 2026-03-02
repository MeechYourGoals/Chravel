import React, { useEffect, useRef, useMemo } from 'react';
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
  requesting_mic: 'Opening audio channel\u2026',
  ready: 'Speak now',
  listening: 'Speak now',
  sending: 'Processing\u2026',
  playing: 'AI is speaking',
  interrupted: 'Speak now',
  error: '',
};

/* ── Waveform bar count & ring geometry ──────────────────── */
const BAR_COUNT = 28;
const RING_RADIUS = 52; // px from center
const BAR_WIDTH = 3;

/**
 * Full-screen immersive voice overlay for Gemini Live bidirectional sessions.
 * "Waveform Ring" design: a static circle with subtle equalizer bars
 * that react to mic/TTS state, plus an orbiting dot when idle/connecting.
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
  const isThinking = state === 'sending';
  const isConnecting = state === 'requesting_mic';
  const isIdle = isConnecting || isThinking;
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

  /* ── Accent color tokens ─────────────────────────────── */
  const accentColor = isError
    ? 'rgb(239 68 68)'   // red-500
    : isListening
      ? 'rgb(16 185 129)' // emerald-500
      : isSpeaking
        ? 'rgb(59 130 246)' // blue-500
        : 'rgb(148 163 184)'; // slate-400

  const labelColor = isError
    ? 'text-red-400'
    : isListening
      ? 'text-emerald-400'
      : isSpeaking
        ? 'text-blue-400'
        : 'text-white/60';

  /* ── Pre-compute bar angles ──────────────────────────── */
  const barAngles = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, i) => (360 / BAR_COUNT) * i),
    [],
  );

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

      {/* Center: Waveform Ring + status */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {/* Static ring container — NO scale pulsing */}
        <div className="relative size-[160px] flex items-center justify-center">
          {/* Subtle background glow — static, no animation */}
          <div
            className="absolute inset-[-20px] rounded-full opacity-20 blur-2xl"
            style={{ background: `radial-gradient(circle, ${accentColor}, transparent 70%)` }}
          />

          {/* Static ring border */}
          <div
            className="absolute inset-0 rounded-full border-2 transition-colors duration-500"
            style={{ borderColor: `color-mix(in srgb, ${accentColor} 30%, transparent)` }}
          />

          {/* ── Waveform bars (radial equalizer) ─────────── */}
          <svg
            className="absolute inset-0"
            viewBox="0 0 160 160"
            fill="none"
            aria-hidden="true"
          >
            {barAngles.map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const cx = 80 + RING_RADIUS * Math.cos(rad);
              const cy = 80 + RING_RADIUS * Math.sin(rad);

              // Staggered animation delays for organic feel
              const delay = (i / BAR_COUNT) * 1.2;

              // Bar height ranges by state
              const minH = 4;
              const maxH = isListening ? 18 : isSpeaking ? 22 : 6;

              return (
                <motion.rect
                  key={i}
                  x={cx - BAR_WIDTH / 2}
                  y={cy - minH / 2}
                  width={BAR_WIDTH}
                  height={minH}
                  rx={BAR_WIDTH / 2}
                  fill={accentColor}
                  opacity={0.6}
                  style={{
                    transformOrigin: `${cx}px ${cy}px`,
                    transform: `rotate(${angle + 90}deg)`,
                  }}
                  animate={
                    isListening || isSpeaking
                      ? {
                          height: [minH, maxH * (0.4 + 0.6 * Math.random()), minH],
                          y: [cy - minH / 2, cy - maxH * (0.4 + 0.6 * Math.random()) / 2, cy - minH / 2],
                          opacity: [0.4, 0.8, 0.4],
                        }
                      : {
                          height: minH,
                          y: cy - minH / 2,
                          opacity: isIdle ? 0.2 : 0.3,
                        }
                  }
                  transition={
                    isListening || isSpeaking
                      ? {
                          duration: isListening ? 1.0 + Math.random() * 0.6 : 0.6 + Math.random() * 0.4,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay,
                        }
                      : { duration: 0.5 }
                  }
                />
              );
            })}
          </svg>

          {/* ── Orbiting dot (idle / connecting / thinking) ── */}
          {isIdle && (
            <motion.div
              className="absolute"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: accentColor,
                boxShadow: `0 0 8px 2px ${accentColor}`,
              }}
              animate={{
                x: Array.from({ length: 61 }, (_, i) => RING_RADIUS * Math.cos((i / 60) * 2 * Math.PI - Math.PI / 2)),
                y: Array.from({ length: 61 }, (_, i) => RING_RADIUS * Math.sin((i / 60) * 2 * Math.PI - Math.PI / 2)),
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          )}

          {/* Center: small static dot indicator */}
          {!isIdle && (
            <div
              className="absolute size-3 rounded-full transition-colors duration-500"
              style={{ background: accentColor, opacity: 0.6 }}
            />
          )}
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
