import React from 'react';
import { Mic, MicOff, Loader2, Volume2, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { VoiceState } from '@/hooks/useGrokVoice';

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
      return 'bg-white/5 text-neutral-500 cursor-pointer hover:bg-white/10';
    }
    switch (voiceState) {
      case 'listening':
        return 'bg-green-500/20 text-green-400 ring-2 ring-green-500/40 animate-pulse';
      case 'thinking':
      case 'connecting':
        return 'bg-purple-500/20 text-purple-400';
      case 'speaking':
        return 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/40';
      case 'error':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-white/5 text-white hover:bg-white/10';
    }
  };

  const getTooltip = () => {
    if (!isEligible) return 'Voice (Pro)';
    switch (voiceState) {
      case 'connecting': return 'Connecting...';
      case 'listening': return 'Tap to send';
      case 'thinking': return 'Processing...';
      case 'speaking': return 'Tap to interrupt';
      case 'error': return 'Tap to retry';
      default: return 'Start voice';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={`relative size-10 rounded-full flex items-center justify-center transition-all duration-200 ${getStyle()}`}
            aria-label={getTooltip()}
          >
            {getIcon()}
            {!isEligible && (
              <Lock size={8} className="absolute -top-0.5 -right-0.5 text-amber-400" />
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
