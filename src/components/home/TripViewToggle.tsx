import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { useIsMobile } from '../../hooks/use-mobile';
import { ScrollFadeContainer } from './ScrollFadeContainer';

interface TripViewToggleProps {
  viewMode: string;
  onViewModeChange: (value: string) => void;
  showRecsTab?: boolean;
  recsTabDisabled?: boolean;
}

export const TripViewToggle = ({ 
  viewMode, 
  onViewModeChange, 
  showRecsTab = false,
  recsTabDisabled = false
}: TripViewToggleProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="w-full mb-6">
      <ScrollFadeContainer className="w-full h-full contents md:contents lg:block">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) {
              onViewModeChange(value);
            }
          }}
          className="bg-card/50 backdrop-blur-xl border-2 border-border/50 rounded-2xl p-1 shadow-lg grid grid-cols-4 w-full min-h-[56px] gap-0.5 lg:flex lg:justify-around"
        >
          <ToggleGroupItem
            value="myTrips"
            aria-label="My Trips"
            className="justify-self-center data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-2 sm:px-3 lg:px-4 py-3 rounded-xl font-bold text-base tracking-wide whitespace-nowrap"
          >
            My Trips
          </ToggleGroupItem>
          <ToggleGroupItem
            value="tripsPro"
            aria-label="Chravel Pro"
            className="justify-self-center data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-2 sm:px-3 lg:px-4 py-3 rounded-xl font-bold text-base tracking-wide whitespace-nowrap"
          >
            {isMobile ? 'Pro' : 'Chravel Pro'}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="events"
            aria-label="Events"
            className="justify-self-center data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-2 sm:px-3 lg:px-4 py-3 rounded-xl font-bold text-base tracking-wide whitespace-nowrap"
          >
            Events
          </ToggleGroupItem>
          {showRecsTab && (
            <ToggleGroupItem
              value="travelRecs"
              aria-label="Chravel Recs"
              disabled={recsTabDisabled}
              title={recsTabDisabled ? "Enable Demo Mode to access Travel Recommendations" : undefined}
              className={`justify-self-center data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-2 sm:px-3 lg:px-4 py-3 rounded-xl font-bold text-base tracking-wide whitespace-nowrap ${recsTabDisabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}`}
              onClick={(e) => {
                if (recsTabDisabled) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              {isMobile ? 'Recs' : 'Chravel Recs'}
            </ToggleGroupItem>
          )}
        </ToggleGroup>
      </ScrollFadeContainer>
    </div>
  );
};
