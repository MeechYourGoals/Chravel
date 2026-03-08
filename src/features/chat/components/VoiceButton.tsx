import React from 'react';
import { AudioLines, Lock, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { VoiceState } from '@/hooks/useWebSpeechVoice';
import { CTA_GRADIENT, CTA_ICON_SIZE } from '@/lib/ctaButtonStyles';

interface VoiceButtonProps {
  /** Conversation engine state (mapped from Gemini Live) */
  voiceState: VoiceState;
  /** Whether the user's plan supports voice */
  isEligible: boolean;
  /** Toggle conversation mode on/off (dictation) */
  onToggle: () => void;
  /** Upgrade prompt for ineligible users */
  onUpgrade?: () => void;
}

/**
 * Waveform button for dictation interaction.
 * Tap: toggle speech-to-text on/off.
 */
export const VoiceButton = ({ voiceState, isEligible, onToggle, onUpgrade }: VoiceButtonProps) => {
  const handleClick = () => {
    if (!isEligible) {
      onUpgrade?.();
      return;
    }

    onToggle();
  };

  const isActive = isEligible && voiceState !== 'idle' && voiceState !== 'error';
  const isConnecting = voiceState === 'connecting' || voiceState === 'thinking';

  const getStyle = () => {
    if (!isEligible) {
      return 'bg-white/5 border border-white/10 text-neutral-500 cursor-pointer hover:bg-white/10 hover:text-neutral-400 hover:border-white/20';
    }
    if (isActive) {
      // Blue is intentional here as a transient AI-listening state color only —
      // not a permanent accent. Signals "AI is actively hearing you right now."
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
    if (isActive) return 'Stop listening';
    if (voiceState === 'error') return 'Tap to retry';
    return 'Tap to dictate';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
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
                className="absolute -top-0.5 -right-0.5 text-gold-primary/90 drop-shadow-md z-10"
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
