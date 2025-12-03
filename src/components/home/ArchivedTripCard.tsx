import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Lock, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useSubscription } from '@/hooks/useSubscription';

interface ArchivedTrip {
  id: string;
  name: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  trip_type: 'consumer' | 'pro' | 'event';
  is_hidden?: boolean;
  cover_image_url?: string;
}

interface ArchivedTripCardProps {
  trip: ArchivedTrip;
  onRestore: (tripId: string) => void;
  onUnhide?: (tripId: string) => void;
  onUpgrade: () => void;
}

export const ArchivedTripCard = ({ trip, onRestore, onUnhide, onUpgrade }: ArchivedTripCardProps) => {
  const navigate = useNavigate();
  const { isPro } = useSubscription();

  const formatDateRange = () => {
    if (!trip.start_date) return 'No dates set';
    const start = new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = trip.end_date 
      ? new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';
    return end ? `${start} - ${end}` : start;
  };

  const getTripTypeLabel = () => {
    switch (trip.trip_type) {
      case 'pro': return 'Pro Trip';
      case 'event': return 'Event';
      default: return 'Trip';
    }
  };

  const getTripTypeColor = () => {
    switch (trip.trip_type) {
      case 'pro': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'event': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default: return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    }
  };

  const handleCardClick = () => {
    if (!isPro) {
      onUpgrade();
      return;
    }
    // Pro users can view archived trips directly
    const route = trip.trip_type === 'pro' 
      ? `/tour/pro/${trip.id}` 
      : trip.trip_type === 'event' 
        ? `/event/${trip.id}` 
        : `/trip/${trip.id}`;
    navigate(route);
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPro) {
      onUpgrade();
      return;
    }
    onRestore(trip.id);
  };

  const handleUnhide = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUnhide?.(trip.id);
  };

  return (
    <div 
      className={`relative group rounded-2xl overflow-hidden transition-all duration-300 border ${
        isPro 
          ? 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 cursor-pointer hover:scale-[1.02]' 
          : 'bg-white/5 border-white/10 opacity-60 grayscale cursor-pointer'
      }`}
      onClick={handleCardClick}
    >
      {/* Lock overlay for free users */}
      {!isPro && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-2 text-white/80">
            <Lock size={32} className="text-amber-400" />
            <span className="text-sm font-medium">Upgrade to View</span>
          </div>
        </div>
      )}

      {/* Cover Image */}
      <div className="relative h-32 bg-gradient-to-br from-gray-700/50 to-gray-800/50">
        {trip.cover_image_url && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${trip.cover_image_url}')` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge variant="secondary" className={getTripTypeColor()}>
            {getTripTypeLabel()}
          </Badge>
          {trip.is_hidden && (
            <Badge variant="secondary" className="bg-gray-500/20 text-gray-300 border-gray-500/30">
              <EyeOff size={12} className="mr-1" />
              Hidden
            </Badge>
          )}
        </div>

        {/* Archived Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/30">
            Archived
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">
          {trip.name}
        </h3>

        {trip.destination && (
          <div className="flex items-center gap-2 text-white/70 mb-1 text-sm">
            <MapPin size={14} className="text-amber-400" />
            <span className="truncate">{trip.destination}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-white/70 text-sm mb-4">
          <Calendar size={14} className="text-amber-400" />
          <span>{formatDateRange()}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isPro ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestore}
                className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
              >
                <RotateCcw size={14} className="mr-1" />
                Restore
              </Button>
              {trip.is_hidden && onUnhide && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnhide}
                  className="bg-white/10 hover:bg-white/20 text-white/80"
                >
                  <Eye size={14} />
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onUpgrade(); }}
              className="flex-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/30"
            >
              <Lock size={14} className="mr-1" />
              Unlock with Pro
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
