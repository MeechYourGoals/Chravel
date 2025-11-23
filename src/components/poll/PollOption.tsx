import React from 'react';
import { PollOption as PollOptionType } from './types';
import { Check } from 'lucide-react';

interface PollOptionProps {
  option: PollOptionType;
  totalVotes: number;
  userVote?: string | string[];
  selectedOptions?: string[];
  onVote: (optionId: string) => void;
  disabled?: boolean;
  isMultiple?: boolean;
  isAnonymous?: boolean;
}

export const PollOption = ({ 
  option, 
  totalVotes, 
  userVote, 
  selectedOptions = [],
  onVote, 
  disabled = false,
  isMultiple = false,
  isAnonymous = false
}: PollOptionProps) => {
  const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
  const isVoted = Array.isArray(userVote) 
    ? userVote.includes(option.id) 
    : userVote === option.id;
  const isSelected = selectedOptions.includes(option.id);
  const showResults = !!userVote || disabled;

  return (
    <button
      onClick={() => onVote(option.id)}
      disabled={disabled && !isMultiple}
      className={`w-full text-left p-2.5 rounded-lg border transition-all ${
        showResults
          ? isVoted
            ? 'border-glass-enterprise-blue bg-glass-enterprise-blue/20'
            : 'border-glass-slate-border bg-glass-slate-bg/50'
          : isSelected
            ? 'border-glass-enterprise-blue bg-glass-enterprise-blue/10'
            : 'border-glass-slate-border hover:border-glass-enterprise-blue hover:bg-glass-enterprise-blue/10'
      } ${!disabled || isMultiple ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
    >
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-2 flex-1">
          {/* Checkbox/radio indicator for multiple choice */}
          {isMultiple && !showResults && (
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected 
                ? 'border-glass-enterprise-blue bg-glass-enterprise-blue' 
                : 'border-gray-400'
            }`}>
              {isSelected && <Check size={12} className="text-white" />}
            </div>
          )}
          
          <span className="font-medium text-white text-sm flex-1">{option.text}</span>
        </div>
        
        {showResults && (
          <span className="text-xs font-semibold text-gray-400">
            {option.votes} vote{option.votes !== 1 ? 's' : ''} ({percentage.toFixed(0)}%)
          </span>
        )}
      </div>
      
      {/* Progress bar (only show after voting) */}
      {showResults && (
        <div className="w-full bg-glass-slate-bg rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-glass-enterprise-blue to-glass-accent-orange h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Voted indicator */}
      {isVoted && showResults && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-glass-enterprise-blue">
          <Check size={12} />
          <span>Your vote</span>
        </div>
      )}
    </button>
  );
};
