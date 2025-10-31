
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
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
      {/* Context Chips */}
      <div className="bg-gray-900/90 backdrop-blur-lg rounded-xl p-2 shadow-lg border border-white/10">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400 font-medium px-2 mb-1">Search Context</p>
          <SearchContextSwitch
            activeContext={activeContext}
            onContextChange={onContextChange}
            tripDisabled={!tripBasecampSet}
            personalDisabled={!personalBasecampSet}
          />
        </div>
      </div>
    </div>
  );
};
