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
        <div className="grid grid-cols-4 gap-0.5 items-center h-16">
          {/* Settings */}
          <button
            onClick={onSettings}
            aria-label="Settings"
            className="w-full h-full flex items-center justify-center gap-1.5 rounded-xl p-3 text-white hover:bg-white/10 transition-all duration-300"
          >
            <Settings size={18} className="flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">Settings</span>
          </button>

          {/* Notifications */}
          <button
            onClick={onNotifications}
            aria-label="Notifications"
            className="w-full h-full flex items-center justify-center gap-1.5 rounded-xl p-3 text-white hover:bg-white/10 transition-all duration-300 relative"
          >
            <Bell size={18} className="flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">Notifications</span>
            {unreadCount > 0 && (
              <div className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </button>

          {/* New Trip */}
          <button
            onClick={onCreateTrip}
            aria-label="Create New Trip"
            className="w-full h-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[hsl(45,95%,58%)] to-[hsl(45,90%,65%)] hover:from-[hsl(45,95%,55%)] hover:to-[hsl(45,90%,62%)] text-black px-3 py-3 font-semibold shadow-lg shadow-primary/30 transition-all duration-300"
          >
            <Plus size={18} className="flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">New Trip</span>
          </button>

          {/* Search */}
          <button
            onClick={onSearch}
            aria-label="Search"
            className="w-full h-full flex items-center justify-center gap-1.5 rounded-xl p-3 text-white hover:bg-white/10 transition-all duration-300"
          >
            <Search size={18} className="flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">Search</span>
          </button>
        </div>
      </div>
    </div>
  );
};
