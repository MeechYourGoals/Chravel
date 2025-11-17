import React, { useMemo, useState } from 'react';
import { TripCard } from '../TripCard';
import { ProTripCard } from '../ProTripCard';
import { EventCard } from '../EventCard';
import { MobileEventCard } from '../MobileEventCard';
import { RecommendationCard } from '../RecommendationCard';
import { LocationSearchBar } from './LocationSearchBar';
import { useIsMobile } from '../../hooks/use-mobile';
import { ProTripData } from '../../types/pro';
import { EventData } from '../../types/events';
import { TripCardSkeleton } from '../ui/loading-skeleton';
import { EnhancedEmptyState } from '../ui/enhanced-empty-state';
import { filterActiveTrips } from '../../services/archiveService';
import { useLocationFilteredRecommendations } from '../../hooks/useLocationFilteredRecommendations';
import { MapPin, Calendar, Briefcase, Compass, Info } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { useSavedRecommendations } from '@/hooks/useSavedRecommendations';

interface Trip {
  id: number;
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
  proTrips: Record<string, ProTripData>;
  events: Record<string, EventData>;
  loading?: boolean;
  onCreateTrip?: () => void;
  activeFilter?: string;
}

export const TripGrid = React.memo(({ 
  viewMode, 
  trips, 
  proTrips, 
  events, 
  loading = false,
  onCreateTrip,
  activeFilter = 'all'
}: TripGridProps) => {
  const isMobile = useIsMobile();
  const [manualLocation, setManualLocation] = useState<string>('');
  const { toggleSave } = useSavedRecommendations();

  // Filter out archived trips - use synchronous version since we don't have async user context
  const activeTrips = useMemo(() => trips, [trips]);
  const activeProTrips = useMemo(() => proTrips, [proTrips]);
  const activeEvents = useMemo(() => events, [events]);

  // Get location-filtered recommendations for travel recs view
  const { 
    recommendations: filteredRecommendations, 
    activeLocation, 
    isBasecampLocation 
  } = useLocationFilteredRecommendations(
    viewMode === 'travelRecs' ? activeFilter : 'all',
    viewMode === 'travelRecs' ? manualLocation : undefined
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
  const hasContent = viewMode === 'myTrips' 
    ? activeTrips.length > 0 
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
      switch (viewMode) {
        case 'myTrips':
          return {
            icon: MapPin,
            title: 'No trips yet',
            description: 'Start planning your next adventure! Create your first trip and invite friends to join.',
            actionLabel: 'Create Your First Trip',
            onAction: onCreateTrip
          };
        case 'tripsPro':
          return {
            icon: Briefcase,
            title: 'No professional trips yet',
            description: 'Manage professional trips, tours, and events with advanced collaboration tools.',
            actionLabel: 'Create Professional Trip',
            onAction: onCreateTrip
          };
        case 'events':
          return {
            icon: Calendar,
            title: 'No events yet',
            description: 'Organize conferences, meetings, and professional events with comprehensive management tools.',
            actionLabel: 'Create Event',
            onAction: onCreateTrip
          };
        case 'travelRecs':
          return {
            icon: Compass,
            title: activeLocation ? `No recommendations found in ${activeLocation}` : 'No recommendations found',
            description: activeLocation 
              ? 'Try searching for a different city or explore all recommendations.' 
              : 'Try searching for a specific city to see local recommendations.',
            actionLabel: 'Clear Location Filter',
            onAction: () => setManualLocation('')
          };
        default:
          return {
            icon: MapPin,
            title: 'No content available',
            description: 'Get started by creating your first item.',
            actionLabel: 'Get Started',
            onAction: onCreateTrip
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
                    : `Showing recommendations for ${activeLocation} (manually selected)`
                  }
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
    <div className="space-y-6 w-full">
      {/* Location alert for travel recs */}
      {viewMode === 'travelRecs' && activeLocation && (
        <Alert className="border-info/50 bg-info/10 mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            {isBasecampLocation 
              ? `Showing recommendations for ${activeLocation} (from your Basecamp)`
              : `Showing recommendations for ${activeLocation} (manually selected)`
            }
          </AlertDescription>
        </Alert>
      )}

      <div className={`grid gap-6 w-full ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
        {viewMode === 'myTrips' ? (
          activeTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))
        ) : viewMode === 'tripsPro' ? (
          Object.values(activeProTrips).map((trip) => (
            <ProTripCard key={trip.id} trip={trip} />
          ))
        ) : viewMode === 'events' ? (
          Object.values(activeEvents).map((event) => (
            isMobile ? (
              <MobileEventCard key={event.id} event={event} />
            ) : (
              <EventCard key={event.id} event={event} />
            )
          ))
        ) : viewMode === 'travelRecs' ? (
          filteredRecommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              onSaveToTrip={async (id) => {
                const rec = filteredRecommendations.find(r => r.id === id);
                if (rec) {
                  await toggleSave(rec);
                }
              }}
            />
          ))
        ) : null}
      </div>
    </div>
  );
});
