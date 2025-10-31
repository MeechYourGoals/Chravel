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
    <div className="flex items-center gap-2 bg-gray-800/50 rounded-xl p-1.5 border border-gray-700">
      <button
        onClick={() => onContextChange('trip')}
        disabled={tripDisabled}
        aria-pressed={activeContext === 'trip'}
        className={`
          flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg 
          text-sm font-medium transition-all
          ${activeContext === 'trip'
            ? 'bg-sky-500/20 text-sky-200 shadow-sm border border-sky-500/30'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
          }
          ${tripDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <Home size={16} />
        <span className="hidden sm:inline">{tripLabel}</span>
        <span className="sm:hidden">Trip</span>
      </button>
      
      <button
        onClick={() => onContextChange('personal')}
        disabled={personalDisabled}
        aria-pressed={activeContext === 'personal'}
        className={`
          flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg 
          text-sm font-medium transition-all
          ${activeContext === 'personal'
            ? 'bg-emerald-500/20 text-emerald-200 shadow-sm border border-emerald-500/30'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
          }
          ${personalDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <MapPin size={16} />
        <span className="hidden sm:inline">{personalLabel}</span>
        <span className="sm:hidden">Personal</span>
      </button>
    </div>
  );
};
