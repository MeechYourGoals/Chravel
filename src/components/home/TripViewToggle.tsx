import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { useIsMobile } from '../../hooks/use-mobile';
import { ScrollFadeContainer } from './ScrollFadeContainer';
import { cn } from '@/lib/utils';

interface TripViewToggleProps {
  viewMode: string;
  onViewModeChange: (value: string) => void;
  showRecsTab?: boolean;
  recsTabDisabled?: boolean;
  className?: string;
  requireAuth?: boolean;
  onAuthRequired?: () => void;
}

export const TripViewToggle = ({ 
  viewMode, 
  onViewModeChange, 
  showRecsTab = false,
  recsTabDisabled = false,
  className,
  requireAuth = false,
  onAuthRequired
}: TripViewToggleProps) => {
  const isMobile = useIsMobile();

  return (
    <div className={cn("w-full", className)}>
      <ScrollFadeContainer className="h-full contents md:contents lg:block">
          <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) {
              // If auth is required for protected tabs, trigger auth modal
              if (requireAuth && ['myTrips', 'tripsPro', 'events'].includes(value)) {
                onAuthRequired?.();
                return;
              }
              onViewModeChange(value);
            }
          }}
          className="bg-card/50 backdrop-blur-xl border-2 border-border/50 rounded-2xl p-1 shadow-lg grid grid-cols-4 h-12 sm:h-16 gap-0.5 sm:gap-1"
        >
          <ToggleGroupItem
            value="myTrips"
            aria-label="My Trips"
            className="justify-self-center h-full data-[state=on]:bg-gradient-to-r data-[state=on]:from-yellow-500 data-[state=on]:to-yellow-600 data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-yellow-500/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-2 sm:px-3 lg:px-4 py-0 rounded-xl font-bold text-sm md:text-base tracking-wide whitespace-nowrap flex items-center justify-center overflow-hidden text-ellipsis min-w-0"
          >
            <span className="inline lg:hidden truncate">Trips</span>
            <span className="hidden lg:inline truncate">My Trips</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="tripsPro"
            aria-label="Pro"
            className="justify-self-center h-full data-[state=on]:bg-gradient-to-r data-[state=on]:from-yellow-500 data-[state=on]:to-yellow-600 data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-yellow-500/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-2 sm:px-3 lg:px-4 py-0 rounded-xl font-bold text-sm md:text-base tracking-wide whitespace-nowrap flex items-center justify-center"
          >
            Pro
          </ToggleGroupItem>
          <ToggleGroupItem
            value="events"
            aria-label="Events"
            className="justify-self-center h-full data-[state=on]:bg-gradient-to-r data-[state=on]:from-yellow-500 data-[state=on]:to-yellow-600 data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-yellow-500/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-2 sm:px-3 lg:px-4 py-0 rounded-xl font-bold text-sm md:text-base tracking-wide whitespace-nowrap flex items-center justify-center"
          >
            Events
          </ToggleGroupItem>
          {showRecsTab && (
            <ToggleGroupItem
              value="travelRecs"
              aria-label="Recs"
              disabled={recsTabDisabled}
              title={recsTabDisabled ? "Enable Demo Mode to access Travel Recommendations" : undefined}
              className={`justify-self-center h-full data-[state=on]:bg-gradient-to-r data-[state=on]:from-yellow-500 data-[state=on]:to-yellow-600 data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-yellow-500/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-2 sm:px-3 lg:px-4 py-0 rounded-xl font-bold text-sm md:text-base tracking-wide whitespace-nowrap flex items-center justify-center ${recsTabDisabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}`}
              onClick={(e) => {
                if (recsTabDisabled) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              Recs
            </ToggleGroupItem>
          )}
        </ToggleGroup>
      </ScrollFadeContainer>
    </div>
  );
};
