
import React from 'react';
import { SearchContextSwitch } from './SearchContextSwitch';

export interface MapOverlayChipsProps {
  activeContext: 'trip' | 'personal';
  onContextChange: (context: 'trip' | 'personal') => void;
  tripBasecampSet: boolean;
  personalBasecampSet: boolean;
}

export const MapOverlayChips: React.FC<MapOverlayChipsProps> = ({
  activeContext,
  onContextChange,
  tripBasecampSet,
  personalBasecampSet
}) => {
  return (
    <div className="absolute top-2 right-2 z-20 flex flex-col gap-2">
      {/* Context Chips */}
      <div className="bg-gray-900/90 backdrop-blur-lg rounded-lg p-1.5 shadow-lg border border-white/10">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] text-gray-400 font-medium px-2 mb-0.5">Search Context</p>
          <button
            onClick={() => tripBasecampSet && onContextChange('trip')}
            disabled={!tripBasecampSet}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              !tripBasecampSet
                ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed opacity-50'
                : activeContext === 'trip'
                ? 'bg-sky-500 text-white shadow-lg ring-1 ring-sky-400'
                : 'bg-sky-900/30 text-sky-300 hover:bg-sky-800/40'
            }`}
          >
            Trip Base Camp {!tripBasecampSet && '(Not Set)'}
          </button>
          
          <button
            onClick={() => personalBasecampSet && onContextChange('personal')}
            disabled={!personalBasecampSet}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              !personalBasecampSet
                ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed opacity-50'
                : activeContext === 'personal'
                ? 'bg-emerald-500 text-white shadow-lg ring-1 ring-emerald-400'
                : 'bg-emerald-900/30 text-emerald-300 hover:bg-emerald-800/40'
            }`}
          >
            Personal Base Camp {!personalBasecampSet && '(Not Set)'}
          </button>
        </div>
      </div>
    </div>
  );
};
