import React, { useState, useEffect } from 'react';
import { Poll as PollType } from './types';
import { PollOption } from './PollOption';
import { Clock, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/useAuth';

interface PollProps {
  poll: PollType;
  onVote: (pollId: string, optionIds: string | string[]) => void;
  onRemoveVote?: (pollId: string) => void;
  onClose?: (pollId: string) => void;
  onExport?: (pollId: string) => void;
  disabled?: boolean;
  isVoting?: boolean;
  isClosing?: boolean;
  isRemovingVote?: boolean;
}

export const Poll = ({ 
  poll, 
  onVote, 
  onRemoveVote,
  onClose, 
  onExport, 
  disabled = false, 
  isVoting = false, 
  isClosing = false,
  isRemovingVote = false
}: PollProps) => {
  const { user } = useAuth();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!poll.deadline_at || poll.status === 'closed') return;

    const updateCountdown = () => {
      const deadline = new Date(poll.deadline_at!);
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Voting ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [poll.deadline_at, poll.status]);

  const isDeadlinePassed = poll.deadline_at ? new Date(poll.deadline_at) < new Date() : false;
  const canVote = !disabled && !isVoting && poll.status === 'active' && !isDeadlinePassed;
  const hasVoted = poll.allow_multiple 
    ? Array.isArray(poll.userVote) && poll.userVote.length > 0
    : !!poll.userVote;
  const canChangeVote = hasVoted && poll.allow_vote_change && canVote;
  const isCreator = user?.id === poll.createdBy;

  const handleVote = (optionId: string) => {
    if (!canVote && !canChangeVote) return;

    if (poll.allow_multiple) {
      setSelectedOptions(prev => {
        const newSelection = prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId];
        return newSelection;
      });
    } else {
      onVote(poll.id, optionId);
    }
  };

  const handleSubmitMultiple = () => {
    if (selectedOptions.length > 0) {
      onVote(poll.id, selectedOptions);
    }
  };

  const handleRemoveVote = () => {
    if (onRemoveVote) {
      onRemoveVote(poll.id);
    }
  };

  const handleClose = () => {
    if (onClose && isCreator) {
      onClose(poll.id);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{poll.question}</h3>
        {poll.status === 'closed' && (
          <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
            Closed
          </span>
        )}
      </div>

      {/* Deadline */}
      {poll.deadline_at && poll.status === 'active' && !isDeadlinePassed && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock size={12} />
          <span>{timeRemaining}</span>
        </div>
      )}

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((option) => (
          <PollOption
            key={option.id}
            option={option}
            totalVotes={poll.totalVotes}
            userVote={poll.userVote}
            selectedOptions={selectedOptions}
            onVote={handleVote}
            disabled={!canVote && !canChangeVote}
            isMultiple={poll.allow_multiple}
          />
        ))}
      </div>

      {/* Submit button for multiple choice */}
      {poll.allow_multiple && canVote && !hasVoted && (
        <Button
          onClick={handleSubmitMultiple}
          disabled={selectedOptions.length === 0 || isVoting}
          className="w-full h-9 rounded-lg bg-primary hover:bg-primary/90 font-medium text-primary-foreground text-sm"
        >
          {isVoting ? 'Submitting...' : `Submit ${selectedOptions.length} Vote${selectedOptions.length !== 1 ? 's' : ''}`}
        </Button>
      )}

      {/* Footer with actions */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">
          {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}
        </p>
        
        <div className="flex items-center gap-2">
          {/* Remove vote button */}
          {hasVoted && poll.allow_vote_change && onRemoveVote && (
            <Button
              onClick={handleRemoveVote}
              disabled={isRemovingVote}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-white"
            >
              <Trash2 size={12} className="mr-1" />
              {isRemovingVote ? 'Removing...' : 'Remove Vote'}
            </Button>
          )}
          
          {/* Close button (only for creator) */}
          {isCreator && poll.status === 'active' && onClose && (
            <Button
              onClick={handleClose}
              disabled={isClosing}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive/80"
            >
              {isClosing ? 'Closing...' : 'Close Poll'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
