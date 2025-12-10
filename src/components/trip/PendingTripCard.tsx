import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface PendingTripCardProps {
  tripId: string;
  tripName: string;
  destination?: string;
  startDate?: string;
  coverImage?: string;
  requestedAt: string;
}

export const PendingTripCard: React.FC<PendingTripCardProps> = ({
  tripId,
  tripName,
  destination,
  startDate,
  coverImage,
  requestedAt
}) => {
  return (
    <Card className="relative overflow-hidden bg-card/50 border-border opacity-60 cursor-not-allowed">
      {/* Pending Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className="flex items-center gap-1.5 bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-full text-xs font-medium">
          <Clock className="w-3.5 h-3.5" />
          Pending Approval
        </div>
      </div>

      {/* Cover Image with Gray Overlay */}
      <div className="relative h-32 bg-muted">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={tripName}
            className="w-full h-full object-cover grayscale"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />
        )}
        <div className="absolute inset-0 bg-background/40" />
      </div>

      <CardContent className="p-4">
        <h3 className="text-lg font-semibold text-muted-foreground mb-2 line-clamp-1">
          {tripName}
        </h3>

        {destination && (
          <div className="flex items-center gap-2 text-muted-foreground/70 text-sm mb-1">
            <MapPin className="w-4 h-4" />
            <span>{destination}</span>
          </div>
        )}

        {startDate && (
          <div className="flex items-center gap-2 text-muted-foreground/70 text-sm mb-3">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(startDate), 'MMM d, yyyy')}</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground/60">
          Requested {format(new Date(requestedAt), 'MMM d, yyyy')}
        </p>
      </CardContent>
    </Card>
  );
};
