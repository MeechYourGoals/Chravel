import React from 'react';
import { ReactionType, ReactionCounts } from '../hooks/useBroadcastReactions';

interface BroadcastResponseButtonsProps {
  responses: ReactionCounts;
  userResponse?: ReactionType;
  onRespond: (response: ReactionType) => void;
}

export const BroadcastResponseButtons = ({
  responses,
  userResponse,
  onRespond
}: BroadcastResponseButtonsProps) => {
  const getButtonClass = (type: ReactionType, activeColor: string, hoverColor: string) => {
    const isActive = userResponse === type;
    return `px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
      isActive 
        ? `${activeColor} text-white` 
        : `bg-slate-700 text-slate-300 ${hoverColor}`
    }`;
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-2">
        <button
          onClick={() => onRespond('coming')}
          className={getButtonClass('coming', 'bg-green-600', 'hover:bg-green-600/50')}
        >
          ✅ Coming ({responses.coming})
        </button>
        <button
          onClick={() => onRespond('wait')}
          className={getButtonClass('wait', 'bg-yellow-600', 'hover:bg-yellow-600/50')}
        >
          ✋ Wait ({responses.wait})
        </button>
        <button
          onClick={() => onRespond('cant')}
          className={getButtonClass('cant', 'bg-red-600', 'hover:bg-red-600/50')}
        >
          ❌ Can't ({responses.cant})
        </button>
      </div>
    </div>
  );
};
