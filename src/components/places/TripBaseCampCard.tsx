import React, { useState } from 'react';
import { MapPin, Home } from 'lucide-react';
import { BasecampLocation } from '@/types/basecamp';
import { BaseCampPill } from './BaseCampPill';
import { StaticMapEmbed } from './StaticMapEmbed';
import { BasecampSelector } from '../BasecampSelector';

export interface TripBaseCampCardProps {
  tripId: string;
  basecamp: BasecampLocation | null;
  onBasecampSet: (basecamp: BasecampLocation) => Promise<void> | void;
  isDemo?: boolean;
}

export const TripBaseCampCard: React.FC<TripBaseCampCardProps> = ({
  tripId,
  basecamp,
  onBasecampSet,
  isDemo = false
}) => {
  const [showSelector, setShowSelector] = useState(false);

  const handleBasecampSet = async (newBasecamp: BasecampLocation) => {
    await onBasecampSet(newBasecamp);
    setShowSelector(false);
  };

  return (
    <>
      <div className="rounded-2xl shadow-lg bg-gray-900/80 border border-white/10 overflow-hidden">
        {/* Map Section */}
        <div className="relative h-64 rounded-t-2xl overflow-hidden">
          {basecamp ? (
            <>
              <StaticMapEmbed
                address={basecamp.address}
                coordinates={basecamp.coordinates}
                className="w-full h-full"
              />
              <BaseCampPill
                label="Trip Base Camp"
                icon="edit"
                tone="trip"
                onClick={() => setShowSelector(true)}
              />
            </>
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <div className="text-center">
                <Home size={48} className="mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400 text-sm">No trip base camp set</p>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-4">
          {basecamp ? (
            <>
              <div className="mb-3 rounded-xl px-4 py-2 text-sm bg-emerald-900/30 text-emerald-200 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <Home size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>
                    All searches use <strong>{basecamp.name || basecamp.address.split(',')[0]}</strong> as your starting point
                  </span>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={18} className="text-sky-400 flex-shrink-0" />
                  <h3 className="text-white font-semibold text-lg">Trip Base Camp</h3>
                </div>
                <p className="text-gray-300 text-sm mb-1">
                  Main meeting point for group activities and shared recommendations
                </p>
                <div className="flex items-start gap-2 mt-3">
                  <MapPin size={14} className="text-sky-400 mt-1 flex-shrink-0" />
                  <div>
                    {basecamp.name && (
                      <p className="text-white font-medium text-sm mb-0.5">{basecamp.name}</p>
                    )}
                    <p className="text-gray-400 text-sm break-words">{basecamp.address}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={18} className="text-sky-400 flex-shrink-0" />
                <h3 className="text-white font-semibold text-lg">Trip Base Camp</h3>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                No basecamp set. Set one so the group can align meetups & recs.
              </p>
              <button
                onClick={() => setShowSelector(true)}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white py-2.5 px-4 rounded-xl transition-colors font-medium text-sm"
              >
                Set Trip Base Camp
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Basecamp Selector Modal */}
      {showSelector && (
        <BasecampSelector
          isOpen={showSelector}
          onClose={() => setShowSelector(false)}
          onBasecampSet={handleBasecampSet}
          currentBasecamp={basecamp || undefined}
        />
      )}
    </>
  );
};
