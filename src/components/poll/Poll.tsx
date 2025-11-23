import React, { useState, useEffect } from 'react';
import { Poll as PollType } from './types';
import { PollOption } from './PollOption';
import { Clock, Download, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/useAuth';

interface PollProps {
  poll: PollType;
  onVote: (pollId: string, optionIds: string | string[]) => void;
  onClose?: (pollId: string) => void;
  onExport?: (pollId: string) => void;
  disabled?: boolean;
  isVoting?: boolean;
  isClosing?: boolean;
}

export const Poll = ({ poll, onVote, onClose, onExport, disabled = false, isVoting = false, isClosing = false }: PollProps) => {
  const { user } = useAuth();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Calculate time remaining for deadline
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
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [poll.deadline_at, poll.status]);

  // Check if voting is allowed
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
      // Multiple choice: toggle selection
      setSelectedOptions(prev => {
        const newSelection = prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId];
        return newSelection;
      });
    } else {
      // Single choice: immediate vote
      onVote(poll.id, optionId);
    }
  };

  const handleSubmitMultiple = () => {
    if (selectedOptions.length > 0) {
      onVote(poll.id, selectedOptions);
    }
  };

  const handleClose = () => {
    if (onClose && isCreator) {
      onClose(poll.id);
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport(poll.id);
    }
  };

  return (
    <div className="bg-glass-slate-card border border-glass-slate-border rounded-xl p-3 shadow-enterprise-lg">
      {/* Header with question and status */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-base font-semibold text-white flex-1">{poll.question}</h3>
        <div className="flex items-center gap-2">
          {poll.status === 'closed' && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              Closed
            </span>
          )}
          {isDeadlinePassed && poll.status === 'active' && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              Expired
            </span>
          )}
        </div>
      </div>

      {/* Deadline countdown */}
      {poll.deadline_at && poll.status === 'active' && !isDeadlinePassed && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Clock size={12} />
          <span>{timeRemaining}</span>
        </div>
      )}

      {/* Poll type indicators */}
      {(poll.allow_multiple || poll.is_anonymous) && (
        <div className="flex items-center gap-2 mb-2">
          {poll.allow_multiple && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Multiple Choice
            </span>
          )}
          {poll.is_anonymous && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Anonymous
            </span>
          )}
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
            isAnonymous={poll.is_anonymous}
          />
        ))}
      </div>

      {/* Submit button for multiple choice */}
      {poll.allow_multiple && canVote && !hasVoted && (
        <Button
          onClick={handleSubmitMultiple}
          disabled={selectedOptions.length === 0 || isVoting}
          className="w-full mt-3 h-9 rounded-lg bg-gradient-to-r from-glass-enterprise-blue to-glass-enterprise-blue-light hover:from-glass-enterprise-blue-light hover:to-glass-enterprise-blue font-semibold shadow-enterprise border border-glass-enterprise-blue/50 text-white text-sm"
        >
          {isVoting ? 'Submitting...' : `Submit ${selectedOptions.length} Vote${selectedOptions.length !== 1 ? 's' : ''}`}
        </Button>
      )}

      {/* Vote change hint */}
      {hasVoted && canChangeVote && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          Click {poll.allow_multiple ? 'options' : 'another option'} to change your vote
        </p>
      )}

      {/* Footer with vote count and actions */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-glass-slate-border">
        <p className="text-xs text-gray-400">
          {poll.totalVotes} total vote{poll.totalVotes !== 1 ? 's' : ''}
        </p>
        
        <div className="flex items-center gap-1">
          {/* Export button */}
          {onExport && hasVoted && (
            <Button
              onClick={handleExport}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-gray-400 hover:text-white"
            >
              <Download size={14} />
            </Button>
          )}
          
          {/* Close button (only for creator) */}
          {isCreator && poll.status === 'active' && onClose && (
            <Button
              onClick={handleClose}
              disabled={isClosing}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              {isClosing ? 'Closing...' : (
                <>
                  <X size={14} className="mr-1" />
                  Close Poll
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
