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
}

export const TripViewToggle = ({ 
  viewMode, 
  onViewModeChange, 
  showRecsTab = false,
  recsTabDisabled = false,
  className
}: TripViewToggleProps) => {
  const isMobile = useIsMobile();

  return (
    <div className={cn("", className)}>
      <ScrollFadeContainer className="w-full h-full contents md:contents lg:block">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) {
              onViewModeChange(value);
            }
          }}
          className="bg-card/50 backdrop-blur-xl border-2 border-border/50 rounded-2xl p-1 shadow-lg grid grid-cols-4 w-full h-16 gap-1 md:gap-1.5"
        >
          <ToggleGroupItem
            value="myTrips"
            aria-label="My Trips"
            className="justify-self-center h-full data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-2 sm:px-3 lg:px-4 py-0 rounded-xl font-bold text-sm md:text-base tracking-wide whitespace-nowrap flex items-center justify-center"
          >
            <span className="inline md:hidden truncate">Trips</span>
            <span className="hidden md:inline truncate">My Trips</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="tripsPro"
            aria-label="Chravel Pro"
            className="justify-self-center h-full data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-2 sm:px-3 lg:px-4 py-0 rounded-xl font-bold text-sm md:text-base tracking-wide whitespace-nowrap flex items-center justify-center"
          >
            <span className="inline lg:hidden truncate">Pro</span>
            <span className="hidden lg:inline truncate">Chravel Pro</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="events"
            aria-label="Events"
            className="justify-self-center h-full data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-2 sm:px-3 lg:px-4 py-0 rounded-xl font-bold text-sm md:text-base tracking-wide whitespace-nowrap flex items-center justify-center"
          >
            <span className="truncate">Events</span>
          </ToggleGroupItem>
          {showRecsTab && (
            <ToggleGroupItem
              value="travelRecs"
              aria-label="Chravel Recs"
              disabled={recsTabDisabled}
              title={recsTabDisabled ? "Enable Demo Mode to access Travel Recommendations" : undefined}
              className={`justify-self-center h-full data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-2 sm:px-3 lg:px-4 py-0 rounded-xl font-bold text-sm md:text-base tracking-wide whitespace-nowrap flex items-center justify-center ${recsTabDisabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}`}
              onClick={(e) => {
                if (recsTabDisabled) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              <span className="inline lg:hidden truncate">Recs</span>
              <span className="hidden lg:inline truncate">Chravel Recs</span>
            </ToggleGroupItem>
          )}
        </ToggleGroup>
      </ScrollFadeContainer>
    </div>
  );
};
