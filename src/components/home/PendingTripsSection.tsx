import React from 'react';
import { PendingTripCard } from '@/components/trip/PendingTripCard';
import { useMyPendingTrips } from '@/hooks/useMyPendingTrips';
import { Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const PendingTripsSection: React.FC = () => {
  const { pendingTrips, isLoading } = useMyPendingTrips();

  // Don't render anything if no pending trips
  if (!isLoading && pendingTrips.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-yellow-400" />
        <h2 className="text-lg font-semibold text-foreground">
          Awaiting Approval
        </h2>
        <span className="text-sm text-muted-foreground">
          ({pendingTrips.length})
        </span>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingTrips.map((request) => (
            <PendingTripCard
              key={request.id}
              tripId={request.trip_id}
              tripName={request.trip?.name || 'Unknown Trip'}
              destination={request.trip?.destination}
              startDate={request.trip?.start_date}
              coverImage={request.trip?.cover_image_url}
              requestedAt={request.requested_at}
            />
          ))}
        </div>
      )}
    </section>
  );
};
