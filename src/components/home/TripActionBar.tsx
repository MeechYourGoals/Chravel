import React, { useState, useEffect } from 'react';
import { Settings, Plus, Search, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { supabase } from '@/integrations/supabase/client';
import { mockNotifications } from '@/mockData/notifications';
import { cn } from '@/lib/utils';

interface TripActionBarProps {
  onSettings: () => void;
  onCreateTrip: () => void;
  onSearch: () => void;
  onNotifications: () => void;
  className?: string;
}

export const TripActionBar = ({ 
  onSettings, 
  onCreateTrip, 
  onSearch,
  onNotifications,
  className 
}: TripActionBarProps) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [unreadCount, setUnreadCount] = useState(0);

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
    <div className={cn("", className)}>
      <div className="bg-card/50 backdrop-blur-xl border-2 border-border/50 rounded-2xl p-1 shadow-lg">
        <div className="grid grid-cols-4 w-full h-16 gap-0.5">
          
          {/* Settings */}
          <button
            onClick={onSettings}
            aria-label="Settings"
            className="h-full flex items-center justify-center gap-2 px-2 sm:px-3 lg:px-4 py-0 rounded-xl text-white hover:bg-white/5 transition-all duration-300 font-bold text-base tracking-wide whitespace-nowrap"
          >
            <Settings size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline text-sm font-medium">Settings</span>
          </button>

          {/* Notifications with Badge */}
          <button
            onClick={onNotifications}
            aria-label="Notifications"
            className="relative h-full flex items-center justify-center gap-2 px-2 sm:px-3 lg:px-4 py-0 rounded-xl text-white hover:bg-white/5 transition-all duration-300 font-bold text-base tracking-wide whitespace-nowrap"
          >
            <Bell size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline text-sm font-medium">Notifications</span>
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
            <span className="hidden sm:inline text-sm font-medium">New Trip</span>
          </button>

          {/* Search */}
          <button
            onClick={onSearch}
            aria-label="Search"
            className="h-full flex items-center justify-center gap-2 px-2 sm:px-3 lg:px-4 py-0 rounded-xl text-white hover:bg-white/5 transition-all duration-300 font-bold text-base tracking-wide whitespace-nowrap"
          >
            <Search size={18} className="flex-shrink-0" />
            <span className="hidden sm:inline text-sm font-medium">Search</span>
          </button>
          
        </div>
      </div>
    </div>
  );
};
