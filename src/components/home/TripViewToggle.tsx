
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { MapPin, Crown, Calendar, Compass, Settings, User, LogIn } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';
import { useAuth } from '../../hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

interface TripViewToggleProps {
  viewMode: string;
  onViewModeChange: (value: string) => void;
  onUpgrade?: () => void;
  onSettings?: (settingsType?: 'consumer' | 'enterprise' | 'events' | 'advertiser', activeSection?: string) => void;
  style?: React.CSSProperties;
  showRecsTab?: boolean;
}

export const TripViewToggle = ({ viewMode, onViewModeChange, onUpgrade, onSettings, style, showRecsTab = false }: TripViewToggleProps) => {
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();

  return (
    <div style={style} className={isMobile ? "overflow-x-auto scrollbar-hide" : ""}>
      <div className={`flex items-center gap-3 ${isMobile ? 'min-w-max' : 'w-full justify-center'}`}>
        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(value) => value && onViewModeChange(value)}
          className={`bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl p-2 flex p-0 m-0 ${isMobile ? 'min-w-max' : ''}`}
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
        </ToggleGroup>

        {/* Settings Dropdown - Outside of ToggleGroup */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`px-3 sm:px-6 py-3 sm:py-4 rounded-xl text-black bg-gradient-to-r from-[hsl(45,95%,58%)] to-[hsl(45,90%,65%)] hover:from-[hsl(45,90%,55%)] hover:to-[hsl(45,85%,62%)] transition-all font-medium flex items-center gap-2 ${isMobile ? 'text-sm whitespace-nowrap' : ''} ${!isMobile ? 'w-[150px]' : ''} justify-center`}>
              <Settings size={isMobile ? 16 : 18} />
              <span className={isMobile ? 'text-sm' : ''}>Settings</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            sideOffset={8}
            className="bg-card/95 backdrop-blur-xl border-2 border-border/50 text-foreground min-w-[220px] z-50 rounded-xl shadow-xl"
          >
            {!user && (
              <>
                <DropdownMenuItem 
                  onClick={() => {/* Auth modal would be triggered from parent */}}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 cursor-pointer rounded-lg"
                >
                  <LogIn size={16} />
                  Log In / Sign Up
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            
            <DropdownMenuItem 
              onClick={() => onSettings?.('consumer', 'profile')}
              className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 cursor-pointer rounded-lg"
            >
              <User size={16} />
              Profile
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={onUpgrade}
              className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 cursor-pointer rounded-lg"
            >
              <Crown size={16} className="text-accent" />
              Upgrade Plan
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 cursor-pointer rounded-lg">
                <Settings size={16} />
                Trip Settings
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-card/95 backdrop-blur-xl border-2 border-border/50 text-foreground min-w-[180px] z-50 rounded-xl shadow-xl">
                <DropdownMenuItem 
                  onClick={() => onSettings?.('consumer')}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-secondary/80 cursor-pointer rounded-lg"
                >
                  Consumer
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onSettings?.('enterprise')}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-secondary/80 cursor-pointer rounded-lg"
                >
                  Enterprise
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onSettings?.('events')}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-secondary/80 cursor-pointer rounded-lg"
                >
                  Events
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onSettings?.('advertiser')}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-secondary/80 cursor-pointer rounded-lg"
                >
                  Advertiser
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {user && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={signOut}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-destructive/20 cursor-pointer text-destructive rounded-lg"
                >
                  <LogIn size={16} />
                  Sign Out
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
