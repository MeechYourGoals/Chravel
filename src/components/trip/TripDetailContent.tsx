
import React from 'react';
import { TripTabs } from '../TripTabs';
import { TripPreferences as TripPreferencesType } from '../../types/consumer';
import { useDemoMode } from '../../hooks/useDemoMode';

interface TripDetailContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onShowTripsPlusModal: () => void;
  tripId: string;
  tripName?: string;
  basecamp: { name: string; address: string };
}

export const TripDetailContent = ({
  activeTab,
  onTabChange,
  onShowTripsPlusModal,
  tripId,
  tripName,
  basecamp
}: TripDetailContentProps) => {
  const { isDemoMode } = useDemoMode();

  return (
    <TripTabs 
      activeTab={activeTab} 
      onTabChange={onTabChange}
      tripId={tripId}
      tripName={tripName}
      basecamp={basecamp}
      showPlaces={true}
      showConcierge={true}
      isDemoMode={isDemoMode}
      tripData={{ trip_type: 'consumer' }}
    />
  );
};
