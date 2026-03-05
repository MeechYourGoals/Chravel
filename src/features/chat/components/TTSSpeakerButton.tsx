import React, { useEffect, useRef, useState } from 'react';
import { Volume2, Loader2, Square } from 'lucide-react';
import type { TTSPlaybackState } from '@/hooks/useConciergeTTS';
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
  const isThisError = playingMessageId === messageId && playbackState === 'error';
  const isActive = isThisPlaying || isThisLoading;

  // Show error visual for 2 seconds, then auto-reset
  const [showError, setShowError] = useState(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isThisError) {
      setShowError(true);
      errorTimerRef.current = setTimeout(() => {
        setShowError(false);
      }, 2000);
    } else {
      setShowError(false);
    }
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [isThisError]);

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
        showError && 'text-red-400 hover:text-red-300',
      )}
      aria-label={
        isActive ? 'Stop speaking' : showError ? 'Voice error — tap to retry' : 'Listen to response'
      }
      title={isActive ? 'Stop' : showError ? 'Error — tap to retry' : 'Listen'}
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
