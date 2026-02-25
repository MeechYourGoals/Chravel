import React from 'react';
import { PollOption as PollOptionType } from './types';

interface PollOptionProps {
  option: PollOptionType;
  totalVotes: number;
  userVote?: string | string[];
  selectedOptions?: string[];
  onVote: (optionId: string) => void;
  disabled?: boolean;
  isMultiple?: boolean;
}

export const PollOption = ({
  option,
  totalVotes,
  userVote,
  selectedOptions = [],
  onVote,
  disabled = false,
  isMultiple = false,
}: PollOptionProps) => {
  const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
  const isVoted = Array.isArray(userVote) ? userVote.includes(option.id) : userVote === option.id;
  const isSelected = selectedOptions.includes(option.id);

  return (
    <button
      onClick={() => onVote(option.id)}
      disabled={disabled && !isMultiple}
      className={`w-full text-left space-y-1.5 p-2 rounded-lg transition-colors ${
        !disabled || isMultiple ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'
      } ${isSelected ? 'bg-white/5' : ''}`}
    >
      {/* Option text and vote count */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-medium ${isVoted ? 'text-primary' : 'text-white'}`}>
          {option.text}
        </span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {option.votes} vote{option.votes !== 1 ? 's' : ''} ({percentage.toFixed(0)}%)
        </span>
      </div>

      {/* Progress bar - always visible with blue-to-orange gradient */}
      <div className="w-full bg-muted/30 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 via-blue-400 to-orange-500"
          style={{ width: `${Math.max(percentage, 0)}%` }}
        />
      </div>
    </button>
  );
};
