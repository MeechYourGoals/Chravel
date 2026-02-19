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
    id: number | string; // Support both numeric IDs (demo) and UUID strings (Supabase)
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
  /** When true, disables swipe-to-delete so drag-to-reorder works on mobile */
  reorderMode?: boolean;
  /** When true, loads cover photo eagerly (for above-the-fold cards) */
  priority?: boolean;
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
  reorderMode = false,
  priority = false,
}) => {
  const { openRowId, setOpenRowId } = useSwipeableRowContext();
  const tripId = trip.id.toString();

  const tripCard = (
    <TripCard
      trip={trip}
      onArchiveSuccess={onTripStateChange}
      onHideSuccess={onTripStateChange}
      onDeleteSuccess={onTripStateChange}
      priority={priority}
    />
  );

  if (!isMobile) {
    return tripCard;
  }

  // When in reorder mode, disable swipe so touch events reach dnd-kit for drag
  return (
    <SwipeableRow
      rowId={tripId}
      openRowId={openRowId}
      onOpenRow={setOpenRowId}
      onDelete={() => onDelete(trip)}
      disabled={isDemoMode || reorderMode}
      deleteLabel="Delete"
      requireConfirmation={false}
    >
      {tripCard}
    </SwipeableRow>
  );
};

interface SwipeableProTripCardWrapperProps {
  trip: ProTripData;
  isMobile: boolean;
  isDemoMode: boolean;
  onDelete: (trip: ProTripData) => Promise<void>;
  onTripStateChange?: () => void;
  /** When true, disables swipe-to-delete so drag-to-reorder works on mobile */
  reorderMode?: boolean;
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
  reorderMode = false,
}) => {
  const { openRowId, setOpenRowId } = useSwipeableRowContext();
  const tripId = trip.id.toString();

  const proTripCard = (
    <ProTripCard
      trip={trip}
      onArchiveSuccess={onTripStateChange}
      onHideSuccess={onTripStateChange}
      onDeleteSuccess={onTripStateChange}
    />
  );

  if (!isMobile) {
    return proTripCard;
  }

  // When in reorder mode, disable swipe so touch events reach dnd-kit for drag
  return (
    <SwipeableRow
      rowId={tripId}
      openRowId={openRowId}
      onOpenRow={setOpenRowId}
      onDelete={() => onDelete(trip)}
      disabled={isDemoMode || reorderMode}
      deleteLabel="Delete"
      requireConfirmation={false}
    >
      {proTripCard}
    </SwipeableRow>
  );
};
