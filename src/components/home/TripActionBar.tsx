import React, { useState, useEffect, useRef } from 'react';
import { Settings, Plus, Search, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { supabase } from '@/integrations/supabase/client';
import { mockNotifications } from '@/mockData/notifications';
import { cn } from '@/lib/utils';

interface TripActionBarProps {
  onSettings: () => void;
  onCreateTrip: () => void;
  onSearch: (query: string) => void;
  onNotifications: () => void;
  className?: string;
  isSettingsOpen?: boolean;
  isNotificationsOpen?: boolean;
  isSearchActive?: boolean;
}

export const TripActionBar = ({ 
  onSettings, 
  onCreateTrip, 
  onSearch,
  onNotifications,
  className,
  isSettingsOpen = false,
  isNotificationsOpen = false,
  isSearchActive = false
}: TripActionBarProps) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Fetch notification count
  useEffect(() => {
    if (!isDemoMode && user) {
      fetchUnreadCount();
      
      // Subscribe to real-time notifications
      const channel = supabase
        .channel('notification_count_updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else if (isDemoMode) {
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    }
  }, [isDemoMode, user]);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isNotificationsOpen &&
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        // Check if click is not on the notifications button
        const target = event.target as HTMLElement;
        const notificationsButton = target.closest('button[aria-label="Notifications"]');
        if (!notificationsButton) {
          // Close dropdown if clicking outside
          onNotifications();
        }
      }
    };

    if (isNotificationsOpen) {
      // Use setTimeout to avoid immediate closure on button click
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isNotificationsOpen, onNotifications]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };
  
  return (
    <div className={cn("relative", className)}>
      <div className="relative bg-card/50 backdrop-blur-xl border-2 border-border/50 rounded-2xl p-1 shadow-lg">
        <div className="grid grid-cols-4 w-full h-16 gap-1.5">
          
          {/* Settings */}
          <button
            onClick={onSettings}
            aria-label="Settings"
            className={cn(
              "h-full flex items-center justify-center gap-2 px-2 sm:px-3 lg:px-4 py-0 rounded-xl transition-all duration-300 font-bold text-base tracking-wide whitespace-nowrap",
              isSettingsOpen
                ? "bg-gradient-to-r from-[hsl(45,95%,58%)] to-[hsl(45,90%,65%)] text-black shadow-lg shadow-primary/30"
                : "text-white hover:bg-white/5"
            )}
          >
            <Settings size={18} className="flex-shrink-0" />
            <span className="hidden md:inline text-xs lg:text-sm font-medium">Settings</span>
          </button>

          {/* Notifications with Badge */}
          <button
            onClick={onNotifications}
            aria-label="Notifications"
            className={cn(
              "relative h-full flex items-center justify-center gap-2 px-2 sm:px-3 lg:px-4 py-0 rounded-xl transition-all duration-300 font-bold text-base tracking-wide whitespace-nowrap",
              isNotificationsOpen
                ? "bg-gradient-to-r from-[hsl(45,95%,58%)] to-[hsl(45,90%,65%)] text-black shadow-lg shadow-primary/30"
                : "text-white hover:bg-white/5"
            )}
          >
            <Bell size={18} className="flex-shrink-0" />
            <span className="hidden md:inline text-xs lg:text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <div className="absolute top-0.5 right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </button>

          {/* New Trip */}
          <button
            onClick={onCreateTrip}
            aria-label="Create New Trip"
            className="h-full flex items-center justify-center gap-2 px-2 sm:px-3 lg:px-4 py-0 rounded-xl text-white hover:bg-white/5 transition-all duration-300 font-bold text-base tracking-wide whitespace-nowrap"
          >
            <Plus size={18} className="flex-shrink-0" />
            <span className="hidden md:inline text-xs lg:text-sm font-medium">New Trip</span>
          </button>

          {/* Search */}
          <div className={cn(
            "h-full flex items-center px-2 rounded-xl transition-all duration-300",
            isSearchActive
              ? "bg-gradient-to-r from-[hsl(45,95%,58%)]/20 to-[hsl(45,90%,65%)]/20 ring-2 ring-primary/50"
              : ""
          )}>
            <div className="relative w-full h-12 flex items-center">
              <Search className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none",
                isSearchActive ? "text-primary" : "text-muted-foreground"
              )} size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch(e.target.value);
                }}
                onFocus={() => {
                  if (searchQuery) {
                    onSearch(searchQuery);
                  }
                }}
                className="w-full h-full pl-8 pr-2 bg-background/50 border border-border/50 rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-background/80 transition-all"
              />
            </div>
          </div>
          
        </div>

        {/* Notifications Dropdown */}
        {isNotificationsOpen && (
          <div 
            ref={notificationsRef}
            className="absolute top-full right-0 mt-2 w-80 bg-card border-2 border-border/50 rounded-2xl shadow-2xl p-4 z-50 max-h-96 overflow-y-auto"
          >
            <h3 className="text-lg font-bold mb-4">Notifications</h3>
            {mockNotifications.length > 0 ? (
              <div className="space-y-2">
                {mockNotifications.slice(0, 5).map((notification) => (
                  <div 
                    key={notification.id}
                    className="p-3 bg-background/50 rounded-lg hover:bg-background/80 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${notification.read ? 'bg-gray-500' : 'bg-primary'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
