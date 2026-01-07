import React from 'react';
import { TripCard } from '../TripCard';
import { ProTripCard } from '../ProTripCard';
import { SwipeableRow } from '../mobile/SwipeableRow';
import { useSwipeableRowContext } from '../../contexts/SwipeableRowContext';
import { ProTripData } from '../../types/pro';

interface Trip {
  id: number | string;
  title: string;
  location: string;
  dateRange: string;
  participants: Array<{
    id: number;
    name: string;
    avatar: string;
  }>;
  placesCount?: number;
  peopleCount?: number;
  created_by?: string;
  coverPhoto?: string;
}

interface SwipeableTripCardWrapperProps {
  trip: Trip;
  isMobile: boolean;
  isDemoMode: boolean;
  onDelete: (trip: Trip) => Promise<void>;
  onTripStateChange?: () => void;
}

/**
 * Wrapper component for TripCard that adds swipe-to-delete functionality on mobile.
 * Desktop: Renders TripCard directly
 * Mobile: Wraps TripCard in SwipeableRow
 */
export const SwipeableTripCardWrapper: React.FC<SwipeableTripCardWrapperProps> = ({
  trip,
  isMobile,
  isDemoMode,
  onDelete,
  onTripStateChange,
}) => {
  const { openRowId, setOpenRowId } = useSwipeableRowContext();
  const tripId = trip.id.toString();

  if (!isMobile) {
    return (
      <TripCard
        trip={trip}
        onArchiveSuccess={onTripStateChange}
        onHideSuccess={onTripStateChange}
        onDeleteSuccess={onTripStateChange}
      />
    );
  }

  return (
    <SwipeableRow
      rowId={tripId}
      openRowId={openRowId}
      onOpenRow={setOpenRowId}
      onDelete={() => onDelete(trip)}
      disabled={isDemoMode}
      deleteLabel="Delete"
      requireConfirmation={false}
    >
      <TripCard
        trip={trip}
        onArchiveSuccess={onTripStateChange}
        onHideSuccess={onTripStateChange}
        onDeleteSuccess={onTripStateChange}
      />
    </SwipeableRow>
  );
};

interface SwipeableProTripCardWrapperProps {
  trip: ProTripData;
  isMobile: boolean;
  isDemoMode: boolean;
  onDelete: (trip: ProTripData) => Promise<void>;
  onTripStateChange?: () => void;
}

/**
 * Wrapper component for ProTripCard that adds swipe-to-delete functionality on mobile.
 * Desktop: Renders ProTripCard directly
 * Mobile: Wraps ProTripCard in SwipeableRow
 */
export const SwipeableProTripCardWrapper: React.FC<SwipeableProTripCardWrapperProps> = ({
  trip,
  isMobile,
  isDemoMode,
  onDelete,
  onTripStateChange,
}) => {
  const { openRowId, setOpenRowId } = useSwipeableRowContext();
  const tripId = trip.id.toString();

  if (!isMobile) {
    return (
      <ProTripCard
        trip={trip}
        onArchiveSuccess={onTripStateChange}
        onHideSuccess={onTripStateChange}
        onDeleteSuccess={onTripStateChange}
      />
    );
  }

  return (
    <SwipeableRow
      rowId={tripId}
      openRowId={openRowId}
      onOpenRow={setOpenRowId}
      onDelete={() => onDelete(trip)}
      disabled={isDemoMode}
      deleteLabel="Delete"
      requireConfirmation={false}
    >
      <ProTripCard
        trip={trip}
        onArchiveSuccess={onTripStateChange}
        onHideSuccess={onTripStateChange}
        onDeleteSuccess={onTripStateChange}
      />
    </SwipeableRow>
  );
};
