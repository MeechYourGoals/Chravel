
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
      <div className="bg-gray-900/90 backdrop-blur-lg rounded-lg p-1 shadow-lg border border-white/10">
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] text-gray-400 font-medium px-1 mb-0.5">Search Context</p>
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
