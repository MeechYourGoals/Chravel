import React from 'react';
import { Volume2, Loader2, Square } from 'lucide-react';
import type { TTSPlaybackState } from '@/hooks/useElevenLabsTTS';
import { cn } from '@/lib/utils';

interface TTSSpeakerButtonProps {
  messageId: string;
  playbackState: TTSPlaybackState;
  playingMessageId: string | null;
  onPlay: (messageId: string) => void;
  onStop: () => void;
}

export const TTSSpeakerButton: React.FC<TTSSpeakerButtonProps> = ({
  messageId,
  playbackState,
  playingMessageId,
  onPlay,
  onStop,
}) => {
  const isThisPlaying = playingMessageId === messageId && playbackState === 'playing';
  const isThisLoading = playingMessageId === messageId && playbackState === 'loading';
  const isActive = isThisPlaying || isThisLoading;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      onStop();
    } else {
      onPlay(messageId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={playbackState === 'loading' && playingMessageId !== messageId}
      className={cn(
        'inline-flex items-center justify-center p-1 rounded-md transition-all',
        'text-white/50 hover:text-white/80 hover:bg-white/10',
        isActive && 'text-blue-400 hover:text-blue-300',
        isThisLoading && 'animate-pulse',
      )}
      aria-label={isActive ? 'Stop speaking' : 'Listen to response'}
      title={isActive ? 'Stop' : 'Listen'}
    >
      {isThisLoading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isThisPlaying ? (
        <Square size={12} className="fill-current" />
      ) : (
        <Volume2 size={14} />
      )}
    </button>
  );
};
