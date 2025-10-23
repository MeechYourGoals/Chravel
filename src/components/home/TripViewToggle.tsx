
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { MapPin, Crown, Calendar, Compass, Zap } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';

interface TripViewToggleProps {
  viewMode: string;
  onViewModeChange: (value: string) => void;
  onUpgrade?: () => void;
  style?: React.CSSProperties;
  showRecsTab?: boolean;
}

export const TripViewToggle = ({ viewMode, onViewModeChange, onUpgrade, style, showRecsTab = false }: TripViewToggleProps) => {
  const isMobile = useIsMobile();

  return (
    <div style={style} className={isMobile ? "overflow-x-auto scrollbar-hide" : ""}>
      <ToggleGroup 
        type="single" 
        value={viewMode} 
        onValueChange={(value) => value && onViewModeChange(value)}
        className={`bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl p-2 flex p-0 m-0 ${isMobile ? 'min-w-max' : 'w-full justify-center'}`}
      >
        <ToggleGroupItem 
          value="myTrips" 
          className={`px-3 sm:px-6 py-3 sm:py-4 rounded-xl text-white data-[state=on]:bg-[hsl(45,95%,58%)] data-[state=on]:text-black transition-all font-medium ${isMobile ? 'text-sm whitespace-nowrap' : ''} ${!isMobile ? 'w-[140px]' : ''}`}
        >
          <div className="flex items-center gap-2">
            <MapPin size={isMobile ? 16 : 18} />
            <span className={isMobile ? 'text-sm' : ''}>My Trips</span>
          </div>
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="tripsPro" 
          className={`px-3 sm:px-6 py-3 sm:py-4 rounded-xl text-white data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(210,8%,45%)] data-[state=on]:to-[hsl(210,10%,55%)] data-[state=on]:text-white transition-all font-medium flex items-center gap-2 ${isMobile ? 'text-sm whitespace-nowrap' : ''} ${!isMobile ? 'w-[140px]' : ''}`}
        >
          <Crown size={isMobile ? 16 : 18} />
          <span className={isMobile ? 'text-sm' : ''}>Chravel Pro</span>
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="events" 
          className={`px-3 sm:px-6 py-3 sm:py-4 rounded-xl text-white data-[state=on]:bg-[hsl(217,91%,25%)] data-[state=on]:text-white transition-all font-medium flex items-center gap-2 ${isMobile ? 'text-sm whitespace-nowrap' : ''} ${!isMobile ? 'w-[140px]' : ''}`}
        >
          <Calendar size={isMobile ? 16 : 18} />
          <span className={isMobile ? 'text-sm' : ''}>Events</span>
        </ToggleGroupItem>
        {showRecsTab && (
          <ToggleGroupItem 
            value="travelRecs" 
            className={`px-3 sm:px-6 py-3 sm:py-4 rounded-xl text-white data-[state=on]:bg-gradient-to-r data-[state=on]:from-glass-accent-orange data-[state=on]:to-glass-accent-orange-light data-[state=on]:text-white transition-all font-medium flex items-center gap-2 ${isMobile ? 'text-sm whitespace-nowrap' : ''} ${!isMobile ? 'w-[140px]' : ''}`}
          >
            <Compass size={isMobile ? 16 : 18} />
            <span className={isMobile ? 'text-sm' : ''}>Chravel Recs</span>
          </ToggleGroupItem>
        )}
        <ToggleGroupItem 
          value="upgrade" 
          className={`px-3 sm:px-6 py-3 sm:py-4 rounded-xl text-black bg-gradient-to-r from-[hsl(45,95%,58%)] to-[hsl(45,90%,65%)] hover:from-[hsl(45,90%,55%)] hover:to-[hsl(45,85%,62%)] transition-all font-medium flex items-center gap-2 ${isMobile ? 'text-sm whitespace-nowrap' : ''} ${!isMobile ? 'w-[150px]' : ''}`}
        >
          <Zap size={isMobile ? 16 : 18} />
          <span className={isMobile ? 'text-sm' : ''}>Upgrade Plan</span>
        </ToggleGroupItem>
        </ToggleGroup>
    </div>
  );
};
