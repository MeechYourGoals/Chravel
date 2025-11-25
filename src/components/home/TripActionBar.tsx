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
    <div className={cn("flex gap-3 items-center", className)}>
      
      {/* Settings - Individual Pill */}
      <button
        onClick={onSettings}
        aria-label="Settings"
        className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 text-white hover:bg-black/30 transition-all duration-200 whitespace-nowrap"
      >
        <Settings size={18} className="flex-shrink-0" />
        <span className="text-sm font-medium">Settings</span>
      </button>

      {/* Notifications - Individual Pill with Badge */}
      <button
        onClick={onNotifications}
        aria-label="Notifications"
        className="relative flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 text-white hover:bg-black/30 transition-all duration-200 whitespace-nowrap"
      >
        <Bell size={18} className="flex-shrink-0" />
        <span className="text-sm font-medium">Notifications</span>
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* New Trip - Individual Pill with Accent */}
      <button
        onClick={onCreateTrip}
        aria-label="Create New Trip"
        className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white hover:bg-black/40 transition-all duration-200 whitespace-nowrap"
      >
        <Plus size={18} className="flex-shrink-0" />
        <span className="text-sm font-medium">New Trip</span>
      </button>

      {/* Search - Individual Pill */}
      <button
        onClick={onSearch}
        aria-label="Search"
        className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 text-white hover:bg-black/30 transition-all duration-200 whitespace-nowrap"
      >
        <Search size={18} className="flex-shrink-0" />
        <span className="text-sm font-medium">Search</span>
      </button>
      
    </div>
  );
};
