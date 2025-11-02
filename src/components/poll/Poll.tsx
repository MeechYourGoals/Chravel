
import React from 'react';
import { Poll as PollType } from './types';
import { PollOption } from './PollOption';

interface PollProps {
  poll: PollType;
  onVote: (pollId: string, optionId: string) => void;
  disabled?: boolean;
  isVoting?: boolean;
}

export const Poll = ({ poll, onVote, disabled = false, isVoting = false }: PollProps) => {
  const handleVote = (optionId: string) => {
    if (!disabled && !isVoting) {
      onVote(poll.id, optionId);
    }
  };

  return (
    <div className="bg-glass-slate-card border border-glass-slate-border rounded-xl p-3 shadow-enterprise-lg">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-base font-semibold text-white flex-1">{poll.question}</h3>
        {poll.status === 'closed' && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            Closed
          </span>
        )}
      </div>
      <div className="space-y-2">
        {poll.options.map((option) => (
          <PollOption
            key={option.id}
            option={option}
            totalVotes={poll.totalVotes}
            userVote={poll.userVote}
            onVote={handleVote}
            disabled={disabled}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        {poll.totalVotes} total votes
      </p>
    </div>
  );
};
