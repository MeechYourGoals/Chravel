
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Settings, User, LogIn, Plus, Crown } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';
import { useAuth } from '../../hooks/useAuth';
import { SearchBar } from '../SearchBar';
import { NotificationBell } from '../NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

interface TripViewToggleProps {
  viewMode: string;
  onViewModeChange: (value: string) => void;
  onUpgrade?: () => void;
  onSettings?: (settingsType?: 'consumer' | 'enterprise' | 'events' | 'advertiser', activeSection?: string) => void;
  onAuth?: () => void;
  onSearch?: (query: string) => void;
  onCreateTrip?: () => void;
  style?: React.CSSProperties;
  showRecsTab?: boolean;
}

export const TripViewToggle = ({ 
  viewMode, 
  onViewModeChange, 
  onUpgrade, 
  onSettings, 
  onAuth,
  onSearch,
  onCreateTrip,
  style, 
  showRecsTab = false 
}: TripViewToggleProps) => {
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();

  return (
    <div className="w-full mb-6">
      {/* Two-Panel Layout */}
      <div className="flex items-center justify-between gap-6">
        {/* LEFT PANEL - View Mode Toggles */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) {
              onViewModeChange(value);
            }
          }}
          className="bg-card/50 backdrop-blur-xl border-2 border-border/50 rounded-2xl p-1 shadow-lg inline-flex"
        >
          <ToggleGroupItem
            value="myTrips"
            aria-label="My Trips"
            className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-muted-foreground hover:text-foreground transition-all duration-300 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium text-xs sm:text-sm"
          >
            My Trips
          </ToggleGroupItem>
          <ToggleGroupItem
            value="tripsPro"
            aria-label="Chravel Pro"
            className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-muted-foreground hover:text-foreground transition-all duration-300 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium text-xs sm:text-sm"
          >
            Chravel Pro
          </ToggleGroupItem>
          <ToggleGroupItem
            value="events"
            aria-label="Events"
            className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-muted-foreground hover:text-foreground transition-all duration-300 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium text-xs sm:text-sm"
          >
            Events
          </ToggleGroupItem>
          {showRecsTab && (
            <ToggleGroupItem
              value="travelRecs"
              aria-label="Chravel Recs"
              className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-muted-foreground hover:text-foreground transition-all duration-300 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium text-xs sm:text-sm"
            >
              Chravel Recs
            </ToggleGroupItem>
          )}
        </ToggleGroup>

        {/* RIGHT PANEL - Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          {onSearch && (
            <div className="hidden lg:block max-w-xs">
              <SearchBar
                placeholder="Search trips..."
                onSearch={onSearch}
                className="w-full"
              />
            </div>
          )}

          {/* New Trip Button */}
          {onCreateTrip && (
            <button
              onClick={onCreateTrip}
              className="w-10 h-10 bg-card/90 backdrop-blur-xl border-2 border-border/50 hover:bg-card hover:border-primary/60 text-foreground rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-primary/30"
              title="New Trip"
            >
              <Plus size={18} />
            </button>
          )}

          {/* Notification Bell */}
          <div className="w-10 h-10">
            <NotificationBell />
          </div>

          {/* Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 bg-emerald-500/90 backdrop-blur-xl border-2 border-emerald-400/50 hover:bg-emerald-500 hover:border-emerald-400/80 text-white rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-emerald-500/50">
                <Settings size={18} />
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
                    onClick={onAuth}
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
                onClick={() => onSettings?.('consumer')}
                className="flex items-center gap-2 px-4 py-3 hover:bg-secondary/80 cursor-pointer rounded-lg"
              >
                Consumer
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => onSettings?.('enterprise')}
                className="flex items-center gap-2 px-4 py-3 hover:bg-secondary/80 cursor-pointer rounded-lg"
              >
                Enterprise
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => onSettings?.('events')}
                className="flex items-center gap-2 px-4 py-3 hover:bg-secondary/80 cursor-pointer rounded-lg"
              >
                Events
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => onSettings?.('advertiser')}
                className="flex items-center gap-2 px-4 py-3 hover:bg-secondary/80 cursor-pointer rounded-lg"
              >
                Advertiser
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem 
                onClick={onUpgrade}
                className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 cursor-pointer rounded-lg"
              >
                <Crown size={16} className="text-accent" />
                Upgrade Plan
              </DropdownMenuItem>

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
    </div>
  );
};
