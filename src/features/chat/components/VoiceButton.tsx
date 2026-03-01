import React, { useCallback, useRef } from 'react';
import { AudioLines, Lock, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import type { VoiceState } from '@/hooks/useWebSpeechVoice';
import { CTA_GRADIENT, CTA_ICON_SIZE } from '@/lib/ctaButtonStyles';

interface VoiceButtonProps {
  /** Conversation engine state (mapped from Gemini Live) */
  voiceState: VoiceState;
  /** Whether the user's plan supports voice */
  isEligible: boolean;
  /** Toggle conversation mode on/off */
  onToggle: () => void;
  /** Upgrade prompt for ineligible users */
  onUpgrade?: () => void;
}

const LONG_PRESS_MS = 500;

/**
 * Waveform button for Conversation Mode (Gemini Live).
 * Sits left of the text input at the same size as the Send button.
 * Long-press shows a helper toast on mobile.
 */
export const VoiceButton = ({ voiceState, isEligible, onToggle, onUpgrade }: VoiceButtonProps) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const clearTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Long-press shows helper toast on mobile
  const handlePressStart = useCallback(() => {
    if (!isEligible) return;
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      longPressTimer.current = null;
      toast('Conversation mode', {
        description: 'Speak back-and-forth with your AI concierge',
        duration: 2000,
      });
    }, LONG_PRESS_MS);
  }, [isEligible]);

  const handlePressEnd = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const handleClick = useCallback(() => {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    if (!isEligible) {
      onUpgrade?.();
      return;
    }
    onToggle();
  }, [isEligible, onToggle, onUpgrade]);

  const isActive = isEligible && voiceState !== 'idle' && voiceState !== 'error';
  const isConnecting = voiceState === 'connecting' || voiceState === 'thinking';

  const getStyle = () => {
    if (!isEligible) {
      return 'bg-white/5 border border-white/10 text-neutral-500 cursor-pointer hover:bg-white/10 hover:text-neutral-400 hover:border-white/20';
    }
    if (isActive) {
      return 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/30';
    }
    if (voiceState === 'error') {
      return 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30';
    }
    // Idle — canonical CTA gradient (shared with Search, Upload, Send)
    return CTA_GRADIENT;
  };

  const getTooltip = () => {
    if (!isEligible) return 'Conversation mode — Upgrade to use';
    if (isActive) return 'End conversation';
    if (voiceState === 'error') return 'Tap to retry';
    return 'Conversation mode';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onTouchCancel={handlePressEnd}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            className={`relative size-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 select-none touch-manipulation ${getStyle()}`}
            aria-label={getTooltip()}
          >
            {/* Animated pulse rings when conversation is active */}
            {isActive && !isConnecting && (
              <>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full bg-blue-400/25 animate-[voice-pulse_2s_ease-out_infinite]"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full bg-cyan-400/15 animate-[voice-pulse_2s_ease-out_0.6s_infinite]"
                />
              </>
            )}
            {/* Glow ring when active */}
            {isActive && (
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-blue-400/30 via-cyan-300/15 to-blue-400/30 blur-sm"
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
                className="absolute -top-0.5 -right-0.5 text-amber-400/90 drop-shadow-md z-10"
              />
            )}
            {/* LIVE badge when conversation is active */}
            {isActive && (
              <span
                aria-hidden
                className="absolute -top-1.5 -right-1.5 bg-blue-500 text-[7px] font-bold tracking-wider text-white px-1 py-px rounded-full ring-1 ring-black/40 z-10 uppercase"
              >
                Live
              </span>
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
