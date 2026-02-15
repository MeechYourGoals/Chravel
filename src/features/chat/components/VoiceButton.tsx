import React from 'react';
import { Mic, MicOff, Loader2, Volume2, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { VoiceState } from '@/hooks/useWebSpeechVoice';

interface VoiceButtonProps {
  voiceState: VoiceState;
  isEligible: boolean;
  onToggle: () => void;
  onUpgrade?: () => void;
}

export const VoiceButton = ({ voiceState, isEligible, onToggle, onUpgrade }: VoiceButtonProps) => {
  const handleClick = () => {
    if (!isEligible) {
      onUpgrade?.();
      return;
    }
    onToggle();
  };

  const getIcon = () => {
    if (!isEligible) return <Mic size={16} />;
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
      return 'bg-gradient-to-r from-indigo-600/40 to-purple-600/40 text-neutral-400 cursor-pointer hover:from-indigo-600/50 hover:to-purple-600/50';
    }
    switch (voiceState) {
      case 'listening':
        return 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white ring-1 ring-emerald-200/60 shadow-lg shadow-emerald-500/25';
      case 'thinking':
      case 'connecting':
        return 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30';
      case 'speaking':
        return 'bg-gradient-to-br from-blue-400 to-cyan-500 text-white ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/30';
      case 'error':
        return 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30';
      default:
        return 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-purple-500/25';
    }
  };

  const getTooltip = () => {
    if (!isEligible) return 'Voice (Pro)';
    switch (voiceState) {
      case 'connecting':
        return 'Connecting...';
      case 'listening':
        return 'Listening...';
      case 'thinking':
        return 'Processing...';
      case 'speaking':
        return 'Tap to interrupt';
      case 'error':
        return 'Tap to retry';
      default:
        return 'Start voice';
    }
  };

  const isActive = isEligible && (voiceState === 'listening' || voiceState === 'speaking');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={`relative size-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 ${getStyle()}`}
            aria-label={getTooltip()}
          >
            {/* Animated pulse rings for listening/speaking — mimics Gemini's
                live-conversation visual. Two concentric rings pulse outward at
                staggered delays using the voice-pulse keyframe. */}
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
                size={8}
                className="absolute -top-0.5 -right-0.5 text-white drop-shadow-md z-10"
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
