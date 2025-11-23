import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Settings, User, LogIn, Plus, Crown, Bell, Search, UserCircle } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';
import { useAuth } from '../../hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { ScrollFadeContainer } from './ScrollFadeContainer';

interface TripViewToggleProps {
  viewMode: string;
  onViewModeChange: (value: string) => void;
  onUpgrade?: () => void;
  onSettings?: (settingsType?: 'consumer' | 'enterprise' | 'events' | 'advertiser', activeSection?: string) => void;
  onAuth?: () => void;
  onSearchClick?: () => void;
  onCreateTrip?: () => void;
  style?: React.CSSProperties;
  showRecsTab?: boolean;
  recsTabDisabled?: boolean;
}

export const TripViewToggle = ({ 
  viewMode, 
  onViewModeChange, 
  onUpgrade, 
  onSettings, 
  onAuth,
  onSearchClick,
  onCreateTrip,
  style, 
  showRecsTab = false,
  recsTabDisabled = false
}: TripViewToggleProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [notifications] = useState([
    { id: '1', type: 'calendar', title: 'Event starts soon', description: 'Tokyo Adventure starts in 2 hours', tripId: 'trip1', timestamp: new Date(), isRead: false },
    { id: '2', type: 'payment', title: 'Payment received', description: 'John paid $50 for hotel', tripId: 'trip2', timestamp: new Date(), isRead: false },
  ]);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="w-full mb-6">
      {/* Two-Panel Layout */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 lg:gap-4">
        {/* LEFT PANEL - View Mode Toggles (Desktop LEFT, Mobile BOTTOM) */}
        <div className="w-full lg:flex-1 lg:max-w-[calc(50%-0.75rem)] order-last lg:order-first">
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

        {/* RIGHT PANEL - Action Pills (Desktop RIGHT, Mobile TOP) */}
        <div className="bg-card/50 backdrop-blur-xl border-2 border-border/50 rounded-2xl p-1 shadow-lg grid grid-cols-4 w-full lg:flex lg:flex-1 lg:max-w-[calc(50%-0.75rem)] lg:items-center gap-0.5 lg:justify-around min-h-[56px] order-first lg:order-last">
          {/* Settings Pill */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="justify-self-center px-2 sm:px-3 lg:px-4 py-3 rounded-xl font-bold text-base text-white hover:text-foreground hover:bg-secondary/50 transition-all duration-300 flex items-center gap-2 whitespace-nowrap tracking-wide"
                aria-label="Settings"
              >
                <Settings size={16} className="flex-shrink-0" />
                <span className="hidden lg:inline">Settings</span>
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
                onClick={() => onSettings?.()}
                className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 cursor-pointer rounded-lg"
              >
                <UserCircle size={16} />
                Profile
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

          {/* Notifications Pill */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="relative justify-self-center px-2 sm:px-3 lg:px-4 py-3 rounded-xl font-bold text-base text-white hover:text-foreground hover:bg-secondary/50 transition-all duration-300 flex items-center gap-2 whitespace-nowrap tracking-wide"
                aria-label="Notifications"
              >
                <Bell size={16} className="flex-shrink-0" />
                <span className="hidden lg:inline">Notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg">
                    {unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              sideOffset={8}
              className="w-80 bg-card/95 backdrop-blur-xl border-2 border-border/50 text-foreground z-50 rounded-xl shadow-xl"
            >
              <div className="flex items-center justify-between p-3 border-b border-border/50">
                <h3 className="font-semibold text-sm">Notifications</h3>
                <button className="text-xs text-primary hover:underline">
                  Mark all read
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="p-3 cursor-pointer hover:bg-secondary/50 rounded-lg"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <Bell size={16} className="mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-xs text-muted-foreground">{notification.description}</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* New Trip Pill */}
          {onCreateTrip && (
            <button
              onClick={onCreateTrip}
              className="justify-self-center px-2 sm:px-3 lg:px-4 py-3 rounded-xl font-bold text-base text-white hover:text-foreground hover:bg-secondary/50 transition-all duration-300 flex items-center gap-2 whitespace-nowrap tracking-wide"
              aria-label="Create New Trip"
            >
              <Plus size={16} className="flex-shrink-0" />
              <span className="hidden lg:inline">New Trip</span>
            </button>
          )}

          {/* Search Button */}
          <button
            onClick={onSearchClick}
            className="px-4 py-2.5 rounded-xl border-2 border-border bg-card/80 backdrop-blur-xl shadow-lg 
              hover:bg-card hover:border-primary/50 hover:shadow-primary/20 
              transition-all duration-300 group flex items-center gap-2"
          >
            <Search className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors hidden lg:inline">
              Search
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
