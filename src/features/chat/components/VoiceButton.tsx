import React, { useRef, useCallback } from 'react';
import { AudioLines, Lock, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { VoiceState } from '@/hooks/useWebSpeechVoice';
import { CTA_GRADIENT, CTA_ICON_SIZE } from '@/lib/ctaButtonStyles';

/** Duration (ms) a press must be held to trigger Gemini Live instead of dictation. */
const LONG_PRESS_MS = 500;

interface VoiceButtonProps {
  /** Conversation engine state (mapped from dictation or Gemini Live) */
  voiceState: VoiceState;
  /** Whether the user's plan supports voice */
  isEligible: boolean;
  /** Tap: toggle basic dictation on/off */
  onToggle: () => void;
  /** Long-press: activate Gemini Live bidirectional voice */
  onLongPress?: () => void;
  /** Upgrade prompt for ineligible users */
  onUpgrade?: () => void;
  /** Whether Gemini Live is currently active (shows different active state) */
  isLiveActive?: boolean;
}

/**
 * Waveform button with dual interaction modes:
 *   Tap  → basic dictation (Web Speech API)
 *   Long-press (500ms) → Gemini Live bidirectional voice
 */
export const VoiceButton = ({
  voiceState,
  isEligible,
  onToggle,
  onLongPress,
  onUpgrade,
  isLiveActive = false,
}: VoiceButtonProps) => {
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);
  const pressStartRef = useRef(0);

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  // ── Press start (touch or mouse) ──
  const handlePressStart = useCallback(() => {
    if (!isEligible) return;
    didLongPressRef.current = false;
    pressStartRef.current = Date.now();

    pressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      pressTimerRef.current = null;
      onLongPress?.();
    }, LONG_PRESS_MS);
  }, [isEligible, onLongPress]);

  // ── Press end (touch or mouse) ──
  const handlePressEnd = useCallback(() => {
    clearPressTimer();
    // If long-press already fired, don't also fire tap
    if (didLongPressRef.current) {
      didLongPressRef.current = false;
      return;
    }
    // Tap: toggle dictation (or upgrade prompt)
    if (!isEligible) {
      onUpgrade?.();
      return;
    }
    onToggle();
  }, [clearPressTimer, isEligible, onToggle, onUpgrade]);

  // Cancel long-press if pointer leaves the button
  const handlePressCancel = useCallback(() => {
    clearPressTimer();
    didLongPressRef.current = false;
  }, [clearPressTimer]);

  // Prevent context menu on long-press (mobile)
  const handleContextMenu = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isEligible && onLongPress) {
        e.preventDefault();
      }
    },
    [isEligible, onLongPress],
  );

  const isActive = isEligible && voiceState !== 'idle' && voiceState !== 'error';
  const isConnecting = voiceState === 'connecting' || voiceState === 'thinking';

  const getStyle = () => {
    if (!isEligible) {
      return 'bg-white/5 border border-white/10 text-neutral-500 cursor-pointer hover:bg-white/10 hover:text-neutral-400 hover:border-white/20';
    }
    if (isLiveActive) {
      // Emerald for Gemini Live active — distinct from blue dictation state
      return 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30';
    }
    if (isActive) {
      // Blue for dictation active — "AI is actively hearing you"
      return 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/30';
    }
    if (voiceState === 'error') {
      return 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30';
    }
    // Idle — gold CTA gradient (consistent with app's primary accent system)
    return CTA_GRADIENT;
  };

  const getTooltip = () => {
    if (!isEligible) return 'Voice — Upgrade to use';
    if (isLiveActive) return 'Live voice active — tap to stop';
    if (isActive) return 'Stop listening';
    if (voiceState === 'error') return 'Tap to retry';
    return 'Tap to dictate · Hold for live voice';
  };

  // Determine which pulse colors to use
  const pulseActive = isActive || isLiveActive;
  const pulseColor1 = isLiveActive ? 'bg-emerald-400/25' : 'bg-blue-400/25';
  const pulseColor2 = isLiveActive ? 'bg-teal-400/15' : 'bg-cyan-400/15';
  const glowGradient = isLiveActive
    ? 'bg-gradient-to-r from-emerald-400/30 via-teal-300/15 to-emerald-400/30'
    : 'bg-gradient-to-r from-blue-400/30 via-cyan-300/15 to-blue-400/30';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            // No onClick — interaction handled by press start/end for long-press detection
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressCancel}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onTouchCancel={handlePressCancel}
            onContextMenu={handleContextMenu}
            className={`relative size-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 select-none touch-manipulation ${getStyle()}`}
            aria-label={getTooltip()}
          >
            {/* Animated pulse rings when active */}
            {pulseActive && !isConnecting && (
              <>
                <span
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 rounded-full ${pulseColor1} animate-[voice-pulse_2s_ease-out_infinite]`}
                />
                <span
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 rounded-full ${pulseColor2} animate-[voice-pulse_2s_ease-out_0.6s_infinite]`}
                />
              </>
            )}
            {/* Glow ring when active */}
            {pulseActive && (
              <span
                aria-hidden
                className={`pointer-events-none absolute -inset-1 rounded-full ${glowGradient} blur-sm`}
              />
            )}
            <span className="relative z-10">
              {isConnecting ? (
                <Loader2 size={CTA_ICON_SIZE} className="animate-spin" />
              ) : (
                <AudioLines size={CTA_ICON_SIZE} />
              )}
            </span>
            {!isEligible && (
              <Lock
                size={10}
                className="absolute -top-0.5 -right-0.5 gold-gradient-icon drop-shadow-md z-10"
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {getTooltip()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
