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
  isLeading = false,
}: PollOptionProps & { isLeading?: boolean }) => {
  const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
  const isVoted = Array.isArray(userVote) ? userVote.includes(option.id) : userVote === option.id;
  const isSelected = selectedOptions.includes(option.id);

  return (
    <button
      onClick={() => onVote(option.id)}
      disabled={disabled && !isMultiple}
      className={`w-full text-left space-y-1.5 p-2.5 min-h-[44px] rounded-lg transition-colors ${
        !disabled || isMultiple ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'
      } ${isSelected ? 'bg-white/5 ring-1 ring-primary/40' : ''} ${isVoted ? 'bg-primary/5' : ''}`}
      aria-label={`Vote for "${option.text}" — ${option.votes} vote${option.votes !== 1 ? 's' : ''} (${percentage.toFixed(0)}%)${isVoted ? ', you voted for this' : ''}${isLeading ? ', currently leading' : ''}`}
      aria-pressed={isVoted || isSelected}
      role="option"
      aria-selected={isVoted || isSelected}
    >
      {/* Option text and vote count */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isMultiple && (
            <div
              className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${
                isSelected || isVoted ? 'bg-primary border-primary' : 'border-muted-foreground/50'
              }`}
              aria-hidden="true"
            >
              {(isSelected || isVoted) && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5L4 7L8 3"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          )}
          <span
            className={`text-sm font-medium truncate ${isVoted ? 'text-primary' : 'text-white'}`}
          >
            {option.text}
          </span>
          {isLeading && totalVotes > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 flex-shrink-0">
              Leading
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {option.votes} vote{option.votes !== 1 ? 's' : ''} ({percentage.toFixed(0)}%)
        </span>
      </div>

      {/* Progress bar - always visible with blue-to-orange gradient */}
      <div
        className="w-full bg-muted/30 rounded-full h-2"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            isLeading && totalVotes > 0
              ? 'bg-gradient-to-r from-green-500 to-emerald-400'
              : 'bg-gradient-to-r from-blue-500 via-blue-400 to-orange-500'
          }`}
          style={{ width: `${Math.max(percentage, 0)}%` }}
        />
      </div>
    </button>
  );
};
