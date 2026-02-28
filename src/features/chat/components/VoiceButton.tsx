import React, { useCallback, useRef } from 'react';
import { Mic, MicOff, Loader2, Volume2, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { VoiceState } from '@/hooks/useWebSpeechVoice';

export type VoiceMode = 'dictation' | 'conversation';

interface VoiceButtonProps {
  voiceState: VoiceState;
  isEligible: boolean;
  onToggle: () => void;
  onUpgrade?: () => void;
  /** Current voice mode — dictation (text-to-input) or conversation (Gemini Live) */
  voiceMode?: VoiceMode;
  /** Callback to switch voice mode. Fired on long press (500 ms). */
  onModeSwitch?: () => void;
  /** Whether Gemini Live is available (feature-flagged). Hides mode switching when false. */
  showModeSwitch?: boolean;
}

const LONG_PRESS_MS = 500;

export const VoiceButton = ({
  voiceState,
  isEligible,
  onToggle,
  onUpgrade,
  voiceMode = 'dictation',
  onModeSwitch,
  showModeSwitch = false,
}: VoiceButtonProps) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  // --- Long press gesture for mode switching ---
  const clearTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePressStart = useCallback(() => {
    if (!isEligible || !showModeSwitch || !onModeSwitch) return;
    didLongPress.current = false;

    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      longPressTimer.current = null;
      onModeSwitch();
    }, LONG_PRESS_MS);
  }, [isEligible, showModeSwitch, onModeSwitch]);

  const handlePressEnd = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const handleClick = useCallback(() => {
    // If a long-press just fired, swallow the click
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

  const getIcon = () => {
    if (!isEligible) return <MicOff size={16} className="opacity-70" />;
    switch (voiceState) {
      case 'connecting':
      case 'thinking':
        return <Loader2 size={16} className="animate-spin" />;
      case 'listening':
        return <Mic size={16} />;
      case 'speaking':
        return <Volume2 size={16} />;
      case 'error':
        return <MicOff size={16} />;
      default:
        return <Mic size={16} />;
    }
  };

  const getStyle = () => {
    if (!isEligible) {
      return 'bg-white/5 border border-white/10 text-neutral-500 cursor-pointer hover:bg-white/10 hover:text-neutral-400 hover:border-white/20';
    }
    switch (voiceState) {
      case 'listening':
        return 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white ring-1 ring-emerald-200/60 shadow-lg shadow-emerald-500/25';
      case 'thinking':
      case 'connecting':
        return 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30';
      case 'speaking':
        return 'bg-gradient-to-br from-blue-400 to-cyan-500 text-white ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/30';
      case 'error':
        return 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30';
      default:
        // Idle state — subtle color hint for current mode
        return voiceMode === 'conversation'
          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:opacity-90 shadow-lg shadow-blue-500/25'
          : 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:opacity-90 shadow-lg shadow-emerald-500/25';
    }
  };

  const getTooltip = () => {
    if (!isEligible) return 'Voice — Upgrade to use';
    switch (voiceState) {
      case 'connecting':
        return 'Starting mic...';
      case 'listening':
        return voiceMode === 'conversation'
          ? 'In conversation — tap to stop'
          : 'Listening — tap to stop';
      case 'thinking':
        return 'Processing...';
      case 'speaking':
        return 'Listening...';
      case 'error':
        return 'Tap to retry';
      default:
        if (showModeSwitch) {
          return voiceMode === 'conversation'
            ? 'Tap for conversation · Hold to switch'
            : 'Tap to dictate · Hold to switch';
        }
        return voiceMode === 'conversation' ? 'Tap for conversation' : 'Tap to dictate';
    }
  };

  const isActive = isEligible && (voiceState === 'listening' || voiceState === 'speaking');

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
            {/* Animated pulse rings for listening/speaking */}
            {isActive && (
              <>
                <span
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 rounded-full animate-[voice-pulse_2s_ease-out_infinite] ${
                    voiceState === 'listening' ? 'bg-emerald-400/25' : 'bg-blue-400/25'
                  }`}
                />
                <span
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 rounded-full animate-[voice-pulse_2s_ease-out_0.6s_infinite] ${
                    voiceState === 'listening' ? 'bg-emerald-400/15' : 'bg-blue-400/15'
                  }`}
                />
              </>
            )}
            {isEligible && voiceState === 'listening' && (
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-400/30 via-teal-300/15 to-emerald-400/30 blur-sm"
              />
            )}
            <span className="relative z-10">{getIcon()}</span>
            {!isEligible && (
              <Lock
                size={10}
                className="absolute -top-0.5 -right-0.5 text-amber-400/90 drop-shadow-md z-10"
              />
            )}
            {/* Mode indicator dot — conversation mode shows a blue dot */}
            {isEligible &&
              showModeSwitch &&
              voiceMode === 'conversation' &&
              voiceState === 'idle' && (
                <span
                  aria-hidden
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-400 ring-1 ring-black/40 z-10"
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
