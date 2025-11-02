import React from 'react';
import { Home, MapPin } from 'lucide-react';

export interface SearchContextSwitchProps {
  activeContext: 'trip' | 'personal';
  onContextChange: (context: 'trip' | 'personal') => void;
  tripLabel?: string;
  personalLabel?: string;
  tripDisabled?: boolean;
  personalDisabled?: boolean;
}

export const SearchContextSwitch: React.FC<SearchContextSwitchProps> = ({
  activeContext,
  onContextChange,
  tripLabel = 'Trip Base Camp',
  personalLabel = 'Personal Base Camp',
  tripDisabled = false,
  personalDisabled = false
}) => {
  return (
    <div className="flex flex-col gap-1 bg-gray-800/50 rounded-lg p-0.5 border border-gray-700">
      <button
        onClick={() => onContextChange('trip')}
        disabled={tripDisabled}
        aria-pressed={activeContext === 'trip'}
        className={`
          flex items-center justify-center gap-1 px-2 py-1 rounded-md 
          text-[10px] font-medium transition-all whitespace-nowrap
          ${activeContext === 'trip'
            ? 'bg-sky-500/20 text-sky-200 shadow-sm border border-sky-500/30'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
          }
          ${tripDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <Home size={10} />
        <span>Trip Base Camp</span>
      </button>
      
      <button
        onClick={() => onContextChange('personal')}
        disabled={personalDisabled}
        aria-pressed={activeContext === 'personal'}
        className={`
          flex items-center justify-center gap-1 px-2 py-1 rounded-md 
          text-[10px] font-medium transition-all whitespace-nowrap
          ${activeContext === 'personal'
            ? 'bg-emerald-500/20 text-emerald-200 shadow-sm border border-emerald-500/30'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
          }
          ${personalDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <MapPin size={10} />
        <span>Personal Base Camp</span>
      </button>
    </div>
  );
};
