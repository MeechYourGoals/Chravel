import React from 'react';
import { TripTabs } from '../TripTabs';
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
  onShowTripsPlusModal: _onShowTripsPlusModal,
  tripId,
  tripName,
  basecamp,
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
