import React, { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Settings, User, LogIn, Plus, Crown, Bell, Search, UserCircle } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';
import { useAuth } from '../../hooks/useAuth';
import { SearchBar } from '../SearchBar';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '../ui/dialog';
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notifications] = useState([
    { id: '1', type: 'calendar', title: 'Event starts soon', description: 'Tokyo Adventure starts in 2 hours', tripId: 'trip1', timestamp: new Date(), isRead: false },
    { id: '2', type: 'payment', title: 'Payment received', description: 'John paid $50 for hotel', tripId: 'trip2', timestamp: new Date(), isRead: false },
  ]);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="w-full mb-6">
      {/* Two-Panel Layout */}
      <div className="flex items-center justify-between gap-3 lg:gap-4">
        {/* LEFT PANEL - View Mode Toggles */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) {
              onViewModeChange(value);
            }
          }}
          className="bg-card/50 backdrop-blur-xl border-2 border-border/50 rounded-2xl p-1 shadow-lg flex flex-1 max-w-[48%] min-h-[56px]"
        >
          <ToggleGroupItem
            value="myTrips"
            aria-label="My Trips"
            className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-4 sm:px-6 py-3 rounded-xl font-bold text-base tracking-wide"
          >
            My Trips
          </ToggleGroupItem>
          <ToggleGroupItem
            value="tripsPro"
            aria-label="Chravel Pro"
            className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-4 sm:px-6 py-3 rounded-xl font-bold text-base tracking-wide"
          >
            Chravel Pro
          </ToggleGroupItem>
          <ToggleGroupItem
            value="events"
            aria-label="Events"
            className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-4 sm:px-6 py-3 rounded-xl font-bold text-base tracking-wide"
          >
            Events
          </ToggleGroupItem>
          {showRecsTab && (
            <ToggleGroupItem
              value="travelRecs"
              aria-label="Chravel Recs"
              className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-[hsl(45,95%,58%)] data-[state=on]:to-[hsl(45,90%,65%)] data-[state=on]:text-black data-[state=on]:shadow-lg data-[state=on]:shadow-primary/30 data-[state=off]:text-white hover:text-foreground transition-all duration-300 px-4 sm:px-6 py-3 rounded-xl font-bold text-base tracking-wide"
            >
              Chravel Recs
            </ToggleGroupItem>
          )}
        </ToggleGroup>

        {/* RIGHT PANEL - Action Pills (Matching Left Panel Style) */}
        <div className="bg-card/50 backdrop-blur-xl border-2 border-border/50 rounded-2xl p-1 shadow-lg flex flex-1 max-w-[48%] items-center gap-0.5 justify-around min-h-[56px]">
          {/* Settings Pill */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="px-3 sm:px-4 lg:px-5 py-3 rounded-xl font-bold text-base text-white hover:text-foreground hover:bg-secondary/50 transition-all duration-300 flex items-center gap-2 whitespace-nowrap tracking-wide"
                aria-label="Settings"
              >
                <Settings size={16} className="flex-shrink-0" />
                <span className="hidden sm:inline">Settings</span>
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
                className="relative px-3 sm:px-4 lg:px-5 py-3 rounded-xl font-bold text-base text-white hover:text-foreground hover:bg-secondary/50 transition-all duration-300 flex items-center gap-2 whitespace-nowrap tracking-wide"
                aria-label="Notifications"
              >
                <Bell size={16} className="flex-shrink-0" />
                <span className="hidden sm:inline">Notifications</span>
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
              className="px-3 sm:px-4 lg:px-5 py-3 rounded-xl font-bold text-base text-white hover:text-foreground hover:bg-secondary/50 transition-all duration-300 flex items-center gap-2 whitespace-nowrap tracking-wide"
              aria-label="Create New Trip"
            >
              <Plus size={16} className="flex-shrink-0" />
              <span className="hidden sm:inline">New Trip</span>
            </button>
          )}

          {/* Search Pill */}
          {onSearch && (
            <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <DialogTrigger asChild>
                <button 
                  className="px-3 sm:px-4 lg:px-5 py-3 rounded-xl font-bold text-base text-white hover:text-foreground hover:bg-secondary/50 transition-all duration-300 flex items-center gap-2 whitespace-nowrap tracking-wide"
                  aria-label="Search"
                >
                  <Search size={16} className="flex-shrink-0" />
                  <span className="hidden sm:inline">Search</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-2 border-border/50">
                <DialogHeader>
                  <DialogTitle>Search Trips</DialogTitle>
                </DialogHeader>
                <SearchBar 
                  placeholder="Search trips, people, files..." 
                  onSearch={(query) => {
                    onSearch(query);
                    if (query) setIsSearchOpen(false);
                  }}
                  className="w-full"
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
};
