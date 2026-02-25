import React, { useEffect, useRef, useState } from 'react';
import { X, Search, MapPin, Users, Calendar, ChevronRight } from 'lucide-react';
import { Input } from '../ui/input';
import { Trip } from '../../data/tripsData';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount?: number;
  /** Filtered trips matching the search query */
  matchingTrips?: Trip[];
  /** Callback when a trip is selected from results */
  onTripSelect?: (tripId: string | number) => void;
}

export const SearchOverlay = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  resultCount = 0,
  matchingTrips = [],
  onTripSelect,
}: SearchOverlayProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Keyboard navigation for results
      if (matchingTrips.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev < matchingTrips.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
          e.preventDefault();
          const trip = matchingTrips[selectedIndex];
          if (trip && onTripSelect) {
            onTripSelect(trip.id);
            onClose();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, matchingTrips, selectedIndex, onTripSelect]);

  if (!isOpen) return null;

  const handleTripClick = (tripId: string | number) => {
    if (onTripSelect) {
      onTripSelect(tripId);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="fixed inset-x-0 top-0 mt-16 sm:mt-20 mx-auto max-w-2xl px-3 sm:px-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Card */}
        <div className="relative bg-card/95 backdrop-blur-xl border-2 border-border/50 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full hover:bg-muted/50 transition-colors"
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search trips..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-12 pr-12 py-5 sm:py-6 text-base sm:text-lg bg-background/50 border-border/50 rounded-full"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted/50 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Trip Results List - Instagram-style dropdown */}
          {searchQuery && matchingTrips.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground px-1">
                {matchingTrips.length} trip{matchingTrips.length !== 1 ? 's' : ''} found
              </div>
              <div className="max-h-[50vh] overflow-y-auto -mx-2 px-2 space-y-1">
                {matchingTrips.map((trip, index) => (
                  <button
                    key={trip.id}
                    onClick={() => handleTripClick(trip.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                      selectedIndex === index
                        ? 'bg-primary/20 border border-primary/40'
                        : 'hover:bg-muted/50 active:bg-muted/70'
                    }`}
                  >
                    {/* Trip Cover Photo or Placeholder */}
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      {trip.coverPhoto ? (
                        <img
                          src={trip.coverPhoto}
                          alt={trip.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Trip Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-base text-foreground truncate">
                        {trip.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-0.5">
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{trip.location}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{trip.dateRange}</span>
                        </div>
                        {trip.participants && trip.participants.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{trip.participants.length}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Chevron indicator */}
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {searchQuery && matchingTrips.length === 0 && (
            <div className="text-sm text-center py-4 text-muted-foreground">
              No trips found for "{searchQuery}"
              <div className="text-xs mt-1">Try different search terms</div>
            </div>
          )}

          {/* Helper Text */}
          {!searchQuery && (
            <div className="text-sm text-muted-foreground text-center space-y-1 py-2">
              <div>Search by trip name, location, or description</div>
              <div className="text-xs">Results appear as you type</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
