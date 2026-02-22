/**
 * Single subscription for user-level trip updates (join requests + trip_members).
 * Replaces dual channels in useTrips: trip_join_requests:${userId} + trip-members-changes.
 */

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const TRIPS_QUERY_KEY = 'trips';

export function useUserTripsRealtime(userId: string | undefined, isDemoMode: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isDemoMode || !userId) return;

    const channel = supabase
      .channel(`user_trips:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trip_join_requests',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          const newStatus = (payload.new as Record<string, unknown>).status;
          const oldStatus = (payload.old as Record<string, unknown>)?.status;
          if (oldStatus === 'pending' && (newStatus === 'approved' || newStatus === 'rejected')) {
            queryClient.invalidateQueries({ queryKey: [TRIPS_QUERY_KEY] });
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_members',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [TRIPS_QUERY_KEY] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isDemoMode, queryClient]);
}
