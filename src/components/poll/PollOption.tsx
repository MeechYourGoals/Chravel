
import React from 'react';
import { PollOption as PollOptionType } from './types';

interface PollOptionProps {
  option: PollOptionType;
  totalVotes: number;
  userVote?: string;
  onVote: (optionId: string) => void;
  disabled?: boolean;
}

export const PollOption = ({ option, totalVotes, userVote, onVote, disabled = false }: PollOptionProps) => {
  const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
  const isVoted = userVote === option.id;

  return (
    <button
      onClick={() => onVote(option.id)}
      disabled={!!userVote || disabled}
      className={`w-full text-left p-2.5 rounded-lg border transition-all ${
        userVote
          ? isVoted
            ? 'border-glass-enterprise-blue bg-glass-enterprise-blue/20'
            : 'border-glass-slate-border bg-glass-slate-bg/50'
          : 'border-glass-slate-border hover:border-glass-enterprise-blue hover:bg-glass-enterprise-blue/10'
      } ${!userVote && !disabled ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
    >
      <div className="flex justify-between items-center mb-1.5">
        <span className="font-medium text-white text-sm">{option.text}</span>
        {(userVote || disabled) && (
          <span className="text-xs font-semibold text-gray-400">
            {option.votes} votes ({percentage.toFixed(0)}%)
          </span>
        )}
      </div>
      {(userVote || disabled) && (
        <div className="w-full bg-glass-slate-bg rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-glass-enterprise-blue to-glass-accent-orange h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </button>
  );
};
