import React from 'react';
import { Home, MapPin } from 'lucide-react';
import { BasecampLocation } from '@/types/basecamp';

export interface GreenNoticeProps {
  activeContext: 'trip' | 'personal';
  tripBasecamp?: BasecampLocation | null;
  personalBasecamp?: BasecampLocation | null;
}

export const GreenNotice: React.FC<GreenNoticeProps> = ({
  activeContext,
  tripBasecamp,
  personalBasecamp
}) => {
  const getContextName = () => {
    if (activeContext === 'trip' && tripBasecamp) {
      return tripBasecamp.name || tripBasecamp.address.split(',')[0];
    }
    if (activeContext === 'personal' && personalBasecamp) {
      return 'Personal Base Camp';
    }
    return 'Base Camp';
  };

  const getContextColor = () => {
    return activeContext === 'trip'
      ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
  };

  const Icon = activeContext === 'trip' ? Home : MapPin;

  return (
    <div className={`rounded-xl px-4 py-3 text-sm border ${getContextColor()}`}>
      <div className="flex items-center gap-2">
        <Icon size={16} className="flex-shrink-0" />
        <span>
          Context:{' '}
          {activeContext === 'personal' ? (
            <strong>Personal Basecamp</strong>
          ) : (
            <strong>Trip Basecamp</strong>
          )}{' '}
          (reference only - search to center map)
        </span>
      </div>
    </div>
  );
};
