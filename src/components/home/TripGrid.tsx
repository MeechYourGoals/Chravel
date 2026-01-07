import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { PendingTripCard } from '../PendingTripCard';
import { PendingTripCard as RequestTripCard } from '../trip/PendingTripCard';
import { EventCard } from '../EventCard';
import { MobileEventCard } from '../MobileEventCard';
import { RecommendationCard } from '../RecommendationCard';
import { LocationSearchBar } from './LocationSearchBar';
import { ArchivedTripCard } from './ArchivedTripCard';
import { UpgradeModal } from '../UpgradeModal';
import { SwipeableRowProvider } from '../../contexts/SwipeableRowContext';
import { SwipeableTripCardWrapper, SwipeableProTripCardWrapper } from './SwipeableTripCardWrapper';
import { useIsMobile } from '../../hooks/use-mobile';
import { ProTripData } from '../../types/pro';
import { EventData } from '../../types/events';
import { TripCardSkeleton } from '../ui/loading-skeleton';
import { EnhancedEmptyState } from '../ui/enhanced-empty-state';
import {
  getArchivedTrips,
  restoreTrip,
  unhideTrip,
  deleteTripForMe,
  archiveTrip,
} from '../../services/archiveService';
import { useLocationFilteredRecommendations } from '../../hooks/useLocationFilteredRecommendations';
import { MapPin, Calendar, Briefcase, Compass, Info, Archive, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { useSavedRecommendations } from '@/hooks/useSavedRecommendations';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '../ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { PendingTripRequest } from '@/hooks/useMyPendingTrips';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';

interface Trip {
  id: number | string; // Support both numeric IDs (demo) and UUID strings (Supabase)
  title: string;
  location: string;
  dateRange: string;
  participants: Array<{
    id: number;
    name: string;
    avatar: string;
  }>;
  placesCount?: number;
}

interface TripGridProps {
  viewMode: string;
  trips: Trip[];
  pendingTrips?: Trip[];
  proTrips: Record<string, ProTripData>;
  events: Record<string, EventData>;
  loading?: boolean;
  onCreateTrip?: () => void;
  activeFilter?: string;
  myPendingRequests?: PendingTripRequest[];
  // Callback when a trip is archived/hidden/deleted (for demo mode refresh)
  onTripStateChange?: () => void;
}

export const TripGrid = React.memo(
  ({
    viewMode,
    trips,
    pendingTrips = [],
    proTrips,
    events,
    loading = false,
    onCreateTrip,
    activeFilter = 'all',
    myPendingRequests = [],
    onTripStateChange,
  }: TripGridProps) => {
    const isMobile = useIsMobile();
    const [manualLocation, setManualLocation] = useState<string>('');
    const { toggleSave } = useSavedRecommendations();
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [archivedTrips, setArchivedTrips] = useState<any[]>([]);
    const { isDemoMode } = useDemoMode();
    const { tier } = useConsumerSubscription();

    // State for optimistically deleted trips (pending undo timeout)
    const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
    const pendingDeleteTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    // Filter out archived trips and pending deletes
    const activeTrips = useMemo(
      () => trips.filter(trip => !pendingDeleteIds.has(trip.id.toString())),
      [trips, pendingDeleteIds],
    );
    const activePendingTrips = useMemo(() => pendingTrips, [pendingTrips]);
    const activeProTrips = useMemo(() => proTrips, [proTrips]);
    const activeEvents = useMemo(() => events, [events]);

    // Fetch archived trips when filter is 'archived'
    useEffect(() => {
      if (activeFilter === 'archived' && user?.id) {
        getArchivedTrips(user.id).then(data => {
          // Combine all archived trips based on viewMode
          let combined: any[] = [];
          if (viewMode === 'myTrips') {
            combined = data.consumer;
          } else if (viewMode === 'tripsPro') {
            combined = data.pro;
          } else if (viewMode === 'events') {
            combined = data.events;
          } else {
            combined = [...data.consumer, ...data.pro, ...data.events];
          }
          setArchivedTrips(combined);
        });
      }
    }, [activeFilter, user?.id, viewMode]);

    const handleRestoreTrip = async (tripId: string) => {
      try {
        const tripType =
          viewMode === 'tripsPro' ? 'pro' : viewMode === 'events' ? 'event' : 'consumer';
        await restoreTrip(tripId, tripType, user?.id);

        // Invalidate trips query cache so main list updates immediately
        queryClient.invalidateQueries({ queryKey: ['trips'] });

        toast({
          title: 'Trip restored',
          description: 'Your trip has been moved back to active trips.',
        });
        // Refresh archived trips
        if (user?.id) {
          const data = await getArchivedTrips(user.id);
          let combined: any[] = [];
          if (viewMode === 'myTrips') combined = data.consumer;
          else if (viewMode === 'tripsPro') combined = data.pro;
          else if (viewMode === 'events') combined = data.events;
          setArchivedTrips(combined);
        }
      } catch (error: any) {
        if (error.message === 'TRIP_LIMIT_REACHED') {
          setShowUpgradeModal(true);
        } else {
          toast({
            title: 'Failed to restore trip',
            description: 'There was an error restoring your trip. Please try again.',
            variant: 'destructive',
          });
        }
      }
    };

    const handleUnhideTrip = async (tripId: string) => {
      try {
        await unhideTrip(tripId);

        // Invalidate trips query cache so main list updates immediately
        queryClient.invalidateQueries({ queryKey: ['trips'] });

        toast({
          title: 'Trip unhidden',
          description: 'Your trip is now visible in the main list.',
        });
      } catch (error) {
        toast({
          title: 'Failed to unhide trip',
          description: 'There was an error. Please try again.',
          variant: 'destructive',
        });
      }
    };

    // Clean up pending delete timeouts on unmount
    useEffect(() => {
      const timeouts = pendingDeleteTimeouts.current;
      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout));
        timeouts.clear();
      };
    }, []);

    // Swipe-to-delete handler with undo functionality
    const handleSwipeDelete = useCallback(
      async (trip: Trip) => {
        const tripId = trip.id.toString();
        const isFreeUser = tier === 'free';
        const tripCreatedBy = (trip as { created_by?: string }).created_by;
        const isCreator = user?.id === tripCreatedBy;

        // Demo mode: block delete with toast
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

        // Optimistically hide the trip
        setPendingDeleteIds(prev => new Set(prev).add(tripId));

        // Create undo handler
        const undoDelete = () => {
          // Cancel the pending delete
          const timeout = pendingDeleteTimeouts.current.get(tripId);
          if (timeout) {
            clearTimeout(timeout);
            pendingDeleteTimeouts.current.delete(tripId);
          }
          // Restore trip visibility
          setPendingDeleteIds(prev => {
            const next = new Set(prev);
            next.delete(tripId);
            return next;
          });
        };

        // Execute the actual delete after 5 seconds (undo window)
        const executeDelete = async () => {
          pendingDeleteTimeouts.current.delete(tripId);

          try {
            // For free users who are creators, auto-archive instead of delete
            if (isCreator && isFreeUser) {
              await archiveTrip(tripId, 'consumer');
              onTripStateChange?.();
            } else {
              // For paid creators and regular members, proceed with deletion
              await deleteTripForMe(tripId, user.id);
              onTripStateChange?.();
            }

            // Invalidate cache to sync with server
            queryClient.invalidateQueries({ queryKey: ['trips'] });
          } catch (error) {
            // Revert on error
            setPendingDeleteIds(prev => {
              const next = new Set(prev);
              next.delete(tripId);
              return next;
            });
            toast({
              title: 'Failed to remove trip',
              description: 'There was an error. Please try again.',
              variant: 'destructive',
            });
          }
        };

        // Set up the delayed delete
        const timeout = setTimeout(executeDelete, 5000);
        pendingDeleteTimeouts.current.set(tripId, timeout);

        // Show toast with undo action
        const description =
          isCreator && isFreeUser
            ? `"${trip.title}" will be archived.`
            : `"${trip.title}" will be removed from your account.`;

        toast({
          title: 'Trip deleted',
          description,
          duration: 5000,
          action: (
            <ToastAction altText="Undo" onClick={undoDelete}>
              Undo
            </ToastAction>
          ),
        });
      },
      [user?.id, isDemoMode, tier, toast, onTripStateChange, queryClient],
    );

    // Handler for deleting pro trips (converts to Trip type for the generic handler)
    const handleProTripSwipeDelete = useCallback(
      async (trip: ProTripData) => {
        if (!user?.id || isDemoMode) return;
        const fakeTrip = { id: trip.id, title: trip.title } as Trip;
        await handleSwipeDelete(fakeTrip);
      },
      [user?.id, isDemoMode, handleSwipeDelete],
    );

    // Get location-filtered recommendations for travel recs view
    const {
      recommendations: filteredRecommendations,
      activeLocation,
      isBasecampLocation,
    } = useLocationFilteredRecommendations(
      viewMode === 'travelRecs' ? activeFilter : 'all',
      viewMode === 'travelRecs' ? manualLocation : undefined,
    );

    // Show loading skeleton
    if (loading) {
      return (
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          <TripCardSkeleton count={isMobile ? 3 : 6} />
        </div>
      );
    }

    // Check if we have content for the current view mode (using filtered data)
    const hasContent =
      activeFilter === 'requests'
        ? myPendingRequests.length > 0
        : activeFilter === 'archived'
          ? archivedTrips.length > 0
          : viewMode === 'myTrips'
            ? activeTrips.length > 0 || activePendingTrips.length > 0
            : viewMode === 'tripsPro'
              ? Object.keys(activeProTrips).length > 0
              : viewMode === 'events'
                ? Object.keys(activeEvents).length > 0
                : viewMode === 'travelRecs'
                  ? filteredRecommendations.length > 0
                  : false;

    // Show enhanced empty state if no content
    if (!hasContent) {
      const getEmptyStateProps = () => {
        if (activeFilter === 'requests') {
          return {
            icon: Clock,
            title: 'No pending requests',
            description:
              "Trips you've requested to join will appear here until approved by the trip admin.",
            actionLabel: undefined,
            onAction: undefined,
          };
        }
        if (activeFilter === 'archived') {
          return {
            icon: Archive,
            title: 'No archived trips',
            description:
              'Trips you archive will appear here. Archive trips to declutter your main view.',
            actionLabel: undefined,
            onAction: undefined,
          };
        }
        switch (viewMode) {
          case 'myTrips':
            return {
              icon: MapPin,
              title: 'No trips yet',
              description:
                'Start planning your next adventure! Create your first trip and invite friends to join.',
              actionLabel: 'Create Your First Trip',
              onAction: onCreateTrip,
            };
          case 'tripsPro':
            return {
              icon: Briefcase,
              title: 'No professional trips yet',
              description:
                'Manage professional trips, tours, and events with advanced collaboration tools.',
              actionLabel: 'Create Professional Trip',
              onAction: onCreateTrip,
            };
          case 'events':
            return {
              icon: Calendar,
              title: 'No events yet',
              description:
                'Organize conferences, meetings, and professional events with comprehensive management tools.',
              actionLabel: 'Create Event',
              onAction: onCreateTrip,
            };
          case 'travelRecs':
            return {
              icon: Compass,
              title: activeLocation
                ? `No recommendations found in ${activeLocation}`
                : 'No recommendations found',
              description: activeLocation
                ? 'Try searching for a different city or explore all recommendations.'
                : 'Try searching for a specific city to see local recommendations.',
              actionLabel: 'Clear Location Filter',
              onAction: () => setManualLocation(''),
            };
          default:
            return {
              icon: MapPin,
              title: 'No content available',
              description: 'Get started by creating your first item.',
              actionLabel: 'Get Started',
              onAction: onCreateTrip,
            };
        }
      };

      return (
        <div className="space-y-6">
          {/* Show location search for travel recs even when empty */}
          {viewMode === 'travelRecs' && (
            <div className="space-y-4">
              <LocationSearchBar
                onLocationSelect={setManualLocation}
                currentLocation={manualLocation}
                autoFromBasecamp={false}
              />
              {activeLocation && (
                <Alert className="border-info/50 bg-info/10">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {isBasecampLocation
                      ? `Showing recommendations for ${activeLocation} (from your Basecamp)`
                      : `Showing recommendations for ${activeLocation} (manually selected)`}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <EnhancedEmptyState {...getEmptyStateProps()} />
        </div>
      );
    }

    // Render content grid (using filtered data)
    return (
      <SwipeableRowProvider>
        <div className="space-y-6 w-full">
          {/* Location alert for travel recs */}
          {viewMode === 'travelRecs' && activeLocation && (
            <Alert className="border-info/50 bg-info/10 mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {isBasecampLocation
                  ? `Showing recommendations for ${activeLocation} (from your Basecamp)`
                  : `Showing recommendations for ${activeLocation} (manually selected)`}
              </AlertDescription>
            </Alert>
          )}

          <div
            className={`grid gap-6 w-full ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}
          >
            {activeFilter === 'requests' ? (
              myPendingRequests.map(request => (
                <RequestTripCard
                  key={request.id}
                  tripId={request.trip_id}
                  tripName={request.trip?.name || 'Trip'}
                  destination={request.trip?.destination}
                  startDate={request.trip?.start_date}
                  coverImage={request.trip?.cover_image_url}
                  requestedAt={request.requested_at}
                />
              ))
            ) : activeFilter === 'archived' ? (
              archivedTrips.map(trip => (
                <ArchivedTripCard
                  key={trip.id}
                  trip={trip}
                  onRestore={handleRestoreTrip}
                  onUnhide={handleUnhideTrip}
                  onUpgrade={() => setShowUpgradeModal(true)}
                />
              ))
            ) : viewMode === 'myTrips' ? (
              <>
                {/* Render active trips first */}
                {activeTrips.map(trip => (
                  <SwipeableTripCardWrapper
                    key={trip.id}
                    trip={trip}
                    isMobile={isMobile}
                    isDemoMode={isDemoMode}
                    onDelete={handleSwipeDelete}
                    onTripStateChange={onTripStateChange}
                  />
                ))}
                {/* Render pending trips after active trips */}
                {activePendingTrips.map(trip => (
                  <PendingTripCard key={trip.id} trip={trip} />
                ))}
              </>
            ) : viewMode === 'tripsPro' ? (
              Object.values(activeProTrips).map(trip => (
                <SwipeableProTripCardWrapper
                  key={trip.id}
                  trip={trip}
                  isMobile={isMobile}
                  isDemoMode={isDemoMode}
                  onDelete={handleProTripSwipeDelete}
                  onTripStateChange={onTripStateChange}
                />
              ))
            ) : viewMode === 'events' ? (
              Object.values(activeEvents).map(event =>
                isMobile ? (
                  <MobileEventCard key={event.id} event={event} />
                ) : (
                  <EventCard
                    key={event.id}
                    event={event}
                    onArchiveSuccess={onTripStateChange}
                    onHideSuccess={onTripStateChange}
                    onDeleteSuccess={onTripStateChange}
                  />
                ),
              )
            ) : viewMode === 'travelRecs' ? (
              filteredRecommendations.map(recommendation => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  onSaveToTrip={async id => {
                    const rec = filteredRecommendations.find(r => r.id === id);
                    if (rec) {
                      await toggleSave(rec);
                    }
                  }}
                />
              ))
            ) : null}
          </div>

          <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
        </div>
      </SwipeableRowProvider>
    );
  },
);
