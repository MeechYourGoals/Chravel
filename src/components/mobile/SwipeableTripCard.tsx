import React, { useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TripCard } from '../TripCard';
import { SwipeableRow } from './SwipeableRow';
import { useIsMobile } from '../../hooks/use-mobile';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/use-toast';
import { useDemoMode } from '../../hooks/useDemoMode';
import { deleteTripForMe, archiveTrip } from '../../services/archiveService';
import { useConsumerSubscription } from '../../hooks/useConsumerSubscription';
import { ToastAction } from '../ui/toast';

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
  coverPhoto?: string;
  placesCount?: number;
  peopleCount?: number;
  created_by?: string;
}

interface SwipeableTripCardProps {
  trip: Trip;
  onArchiveSuccess?: () => void;
  onHideSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

/**
 * Mobile-optimized TripCard wrapper with swipe-to-delete functionality.
 *
 * On mobile:
 * - Swipe left to reveal delete button
 * - Tap delete to confirm and remove trip
 * - Shows undo toast with 5-second window
 *
 * On desktop:
 * - Renders standard TripCard (no swipe behavior)
 */
export const SwipeableTripCard: React.FC<SwipeableTripCardProps> = ({
  trip,
  onArchiveSuccess,
  onHideSuccess,
  onDeleteSuccess,
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();
  const { tier } = useConsumerSubscription();
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPendingDelete, setIsPendingDelete] = useState(false);

  const isFreeUser = tier === 'free';
  const isCreator = user?.id === trip.created_by;

  // Handle swipe delete (with undo capability)
  const handleSwipeDelete = useCallback(async () => {
    // Demo mode: block delete
    if (isDemoMode) {
      toast({
        title: 'Demo trip',
        description: 'This is a demo trip and cannot be deleted.',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Not logged in',
        description: 'You must be logged in to manage trips.',
        variant: 'destructive',
      });
      return;
    }

    // For free users who are creators, auto-archive instead
    if (isCreator && isFreeUser) {
      try {
        await archiveTrip(trip.id.toString(), 'consumer');
        toast({
          title: 'Trip archived',
          description: `"${trip.title}" has been archived. Upgrade to restore it anytime!`,
          action: (
            <ToastAction
              altText="View Plans"
              onClick={() => {
                window.location.href = '/settings';
              }}
            >
              View Plans
            </ToastAction>
          ),
        });
        onArchiveSuccess?.();
      } catch (error) {
        toast({
          title: 'Failed to archive trip',
          description: 'There was an error archiving your trip. Please try again.',
          variant: 'destructive',
        });
      }
      return;
    }

    // For paid creators and regular members, show optimistic delete with undo
    setIsPendingDelete(true);

    // Show undo toast
    const { dismiss } = toast({
      title: 'Trip deleted',
      description: `"${trip.title}" has been removed.`,
      action: (
        <ToastAction
          altText="Undo"
          onClick={() => {
            // Cancel the pending delete
            if (undoTimeoutRef.current) {
              clearTimeout(undoTimeoutRef.current);
              undoTimeoutRef.current = null;
            }
            setIsPendingDelete(false);
            toast({
              title: 'Restored',
              description: `"${trip.title}" has been restored.`,
            });
          }}
        >
          Undo
        </ToastAction>
      ),
    });

    // Schedule actual deletion after 5 seconds
    undoTimeoutRef.current = setTimeout(async () => {
      try {
        await deleteTripForMe(trip.id.toString(), user.id);
        onDeleteSuccess?.();
      } catch (error) {
        toast({
          title: 'Failed to remove trip',
          description: 'There was an error removing the trip. Please try again.',
          variant: 'destructive',
        });
        setIsPendingDelete(false);
      }
      undoTimeoutRef.current = null;
    }, 5000);

    // Dismiss the toast after 5 seconds
    setTimeout(() => {
      dismiss();
    }, 5500);
  }, [
    isDemoMode,
    user?.id,
    isCreator,
    isFreeUser,
    trip.id,
    trip.title,
    toast,
    onArchiveSuccess,
    onDeleteSuccess,
  ]);

  // Navigate to trip on click
  const handleClick = useCallback(() => {
    if (!isPendingDelete) {
      navigate(`/trip/${trip.id}`);
    }
  }, [navigate, trip.id, isPendingDelete]);

  // Don't render if pending delete (optimistic UI)
  if (isPendingDelete) {
    return null;
  }

  // Desktop: render standard TripCard
  if (!isMobile) {
    return (
      <TripCard
        trip={trip}
        onArchiveSuccess={onArchiveSuccess}
        onHideSuccess={onHideSuccess}
        onDeleteSuccess={onDeleteSuccess}
      />
    );
  }

  // Mobile: wrap with SwipeableRow
  return (
    <SwipeableRow
      id={trip.id.toString()}
      onDelete={handleSwipeDelete}
      deleteTitle="Delete Trip For Me"
      deleteDescription={`Are you sure you want to delete "${trip.title}" from your account? This action cannot be undone.`}
      canDelete={!isDemoMode}
      onClick={handleClick}
    >
      <TripCard
        trip={trip}
        onArchiveSuccess={onArchiveSuccess}
        onHideSuccess={onHideSuccess}
        onDeleteSuccess={onDeleteSuccess}
      />
    </SwipeableRow>
  );
};

export default SwipeableTripCard;
