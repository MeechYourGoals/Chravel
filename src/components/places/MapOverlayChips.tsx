import React from 'react';
import { Home, MapPin } from 'lucide-react';

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
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
      {/* Context Chips */}
      <div className="bg-gray-900/90 backdrop-blur-lg rounded-xl p-2 shadow-lg border border-white/10">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400 font-medium px-2 mb-1">Search Context</p>
          
          {/* Trip Base Camp Chip */}
          <button
            onClick={() => tripBasecampSet && onContextChange('trip')}
            disabled={!tripBasecampSet}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${
                activeContext === 'trip'
                  ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30'
                  : tripBasecampSet
                  ? 'text-gray-300 hover:bg-white/5'
                  : 'text-gray-600 cursor-not-allowed'
              }
            `}
            aria-pressed={activeContext === 'trip'}
            title={tripBasecampSet ? 'Use Trip Base Camp for searches' : 'No trip base camp set'}
          >
            <Home size={14} />
            <span className="text-xs">Trip Base Camp</span>
          </button>

          {/* Personal Base Camp Chip */}
          <button
            onClick={() => onContextChange('personal')}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${
                activeContext === 'personal'
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30'
                  : personalBasecampSet
                  ? 'text-gray-300 hover:bg-white/5'
                  : 'text-amber-400 hover:bg-amber-500/10'
              }
            `}
            aria-pressed={activeContext === 'personal'}
            title={
              personalBasecampSet ? 'Use Personal Base Camp for searches' : 'Click to set up your accommodation'
            }
          >
            <MapPin size={14} />
            <span className="text-xs">Personal Base Camp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
