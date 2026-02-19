import React from 'react';
import { BasecampLocation } from '@/types/basecamp';
import { TripLinksDisplay } from './TripLinksDisplay';

export interface LinksPanelProps {
  tripId: string;
  basecamp?: BasecampLocation | null;
}

export const LinksPanel: React.FC<LinksPanelProps> = ({ tripId, basecamp: _basecamp }) => {
  return (
    <div className="space-y-6">
      {/* Trip Links from Database */}
      <TripLinksDisplay tripId={tripId} />
    </div>
  );
};
