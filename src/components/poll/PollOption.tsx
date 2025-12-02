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
  isMultiple = false
}: PollOptionProps) => {
  const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
  const isVoted = Array.isArray(userVote) 
    ? userVote.includes(option.id) 
    : userVote === option.id;
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
      
      {/* Progress bar - always visible */}
      <div className="w-full bg-muted/30 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            isVoted 
              ? 'bg-gradient-to-r from-orange-500 to-orange-400' 
              : 'bg-gradient-to-r from-primary to-primary/70'
          }`}
          style={{ width: `${Math.max(percentage, 0)}%` }}
        />
      </div>
    </button>
  );
};
