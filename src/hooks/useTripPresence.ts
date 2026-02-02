import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  lastSeen: Date;
  isActive: boolean;
  currentPage?: string;
}

/**
 * useTripPresence Hook
 * 
 * Tracks real-time presence of users viewing/editing a trip.
 * Shows "who's viewing" indicators for collaboration awareness.
 * 
 * Features:
 * - Real-time presence updates via Supabase Realtime
 * - Automatic cleanup of stale presence (5 min timeout)
 * - Page-level presence tracking (which page user is on)
 * - Mobile-optimized with efficient updates
 */
export const useTripPresence = (tripId: string, userId?: string, currentPage?: string) => {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<any>(null);
  const lastHeartbeatRef = useRef<Date>(new Date());

  // Heartbeat: Update presence every 30 seconds
  useEffect(() => {
    if (!tripId || !userId) return;

    const sendHeartbeat = async () => {
      try {
        const { error } = await (supabase as any)
          .from('trip_presence')
          .upsert({
            trip_id: tripId,
            user_id: userId,
            last_seen: new Date().toISOString(),
            current_page: currentPage || 'unknown',
            is_active: true
          }, {
            onConflict: 'trip_id,user_id'
          });

        if (!error) {
          lastHeartbeatRef.current = new Date();
        }
      } catch (error) {
        console.error('Error sending presence heartbeat:', error);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      // Mark as inactive
      if (tripId && userId) {
        (supabase as any)
          .from('trip_presence')
          .update({ is_active: false })
          .eq('trip_id', tripId)
          .eq('user_id', userId)
          .then(() => {});
      }
    };
  }, [tripId, userId, currentPage]);

  // Subscribe to presence changes
  useEffect(() => {
    if (!tripId) return;

    // Fetch initial presence
    const fetchPresence = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('trip_presence')
          .select(`
            user_id,
            last_seen,
            current_page,
            is_active,
            profiles:user_id (
              display_name,
              avatar_url
            )
          `)
          .eq('trip_id', tripId)
          .eq('is_active', true);

        if (error) throw error;

        const now = new Date();
        const activeUsersList: PresenceUser[] = (data || [])
          .filter((presence: any) => {
            // Filter out stale presence (older than 5 minutes)
            const lastSeen = new Date(presence.last_seen);
            const minutesSinceSeen = (now.getTime() - lastSeen.getTime()) / 1000 / 60;
            return minutesSinceSeen < 5;
          })
          .map((presence: any) => ({
            userId: presence.user_id,
            displayName: presence.profiles?.display_name || 'Former Member',
            avatarUrl: presence.profiles?.avatar_url,
            lastSeen: new Date(presence.last_seen),
            isActive: presence.is_active,
            currentPage: presence.current_page
          }));

        setActiveUsers(activeUsersList);
      } catch (error) {
        console.error('Error fetching presence:', error);
      }
    };

    fetchPresence();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`trip-presence-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_presence',
          filter: `trip_id=eq.${tripId}`
        },
        () => {
          // Refetch presence on any change
          fetchPresence();
        }
      )
      .subscribe();

    presenceChannelRef.current = channel;

    // Periodic cleanup check
    const cleanupInterval = setInterval(() => {
      fetchPresence();
    }, 60000); // Every minute

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
      clearInterval(cleanupInterval);
    };
  }, [tripId]);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Get count of active users
   */
  const activeUserCount = activeUsers.filter((u) => u.userId !== userId).length;

  /**
   * Check if a specific user is active
   */
  const isUserActive = (targetUserId: string): boolean => {
    return activeUsers.some((u) => u.userId === targetUserId && u.isActive);
  };

  /**
   * Get users on a specific page
   */
  const getUsersOnPage = (page: string): PresenceUser[] => {
    return activeUsers.filter((u) => u.currentPage === page && u.userId !== userId);
  };

  return {
    activeUsers,
    activeUserCount,
    isOnline,
    isUserActive,
    getUsersOnPage
  };
};
