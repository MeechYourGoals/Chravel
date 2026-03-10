import React, { useState } from 'react';
import { PlaceWithDistance, BasecampLocation } from '@/types/basecamp';
import { AddPlaceModal } from '../AddPlaceModal';
import { AddToCalendarData } from '@/types/calendar';
import { TripLinksDisplay } from './TripLinksDisplay';
import { PersonalBasecamp } from '@/services/basecampService';

export interface LinksPanelProps {
  tripId: string;
  places: PlaceWithDistance[];
  basecamp?: BasecampLocation | null;
  personalBasecamp?: PersonalBasecamp | null;
  onPlaceAdded: (place: PlaceWithDistance) => void;
  onPlaceRemoved: (placeId: string) => void;
  onAddToLinks: (place: PlaceWithDistance) => Promise<boolean>;
  linkedPlaceIds: Set<string>;
  onEventAdded: (eventData: AddToCalendarData) => void;
}

export const LinksPanel: React.FC<LinksPanelProps> = ({
  tripId,
  places,
  basecamp,
  personalBasecamp,
  onPlaceAdded,
  onPlaceRemoved,
  onAddToLinks,
  linkedPlaceIds,
  onEventAdded,
}) => {
  const [isAddPlaceModalOpen, setIsAddPlaceModalOpen] = useState(false);

  return (
    <>
      <div className="space-y-6">
        {/* Trip Links from Database */}
        <TripLinksDisplay tripId={tripId} />
      </div>

      <AddPlaceModal
        isOpen={isAddPlaceModalOpen}
        onClose={() => setIsAddPlaceModalOpen(false)}
        onPlaceAdded={onPlaceAdded}
        basecamp={basecamp}
      />
    </>
  );
};
