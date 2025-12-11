import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';

export const useInboundJoinRequests = () => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPendingCount = useCallback(async () => {
    if (isDemoMode) {
      // Demo mode: show mock count for demonstration
      setPendingCount(2);
      setIsLoading(false);
      return;
    }

    if (!user?.id) {
      setPendingCount(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // First get trips where user is creator or admin
      const { data: userTrips, error: tripsError } = await supabase
        .from('trips')
        .select('id')
        .eq('created_by', user.id);

      if (tripsError) {
        console.error('Error fetching user trips:', tripsError);
        setPendingCount(0);
        return;
      }

      // Also get trips where user is admin
      const { data: adminTrips, error: adminError } = await supabase
        .from('trip_admins')
        .select('trip_id')
        .eq('user_id', user.id);

      if (adminError) {
        console.error('Error fetching admin trips:', adminError);
      }

      // Combine trip IDs
      const tripIds = new Set<string>();
      userTrips?.forEach(t => tripIds.add(t.id));
      adminTrips?.forEach(t => tripIds.add(t.trip_id));

      if (tripIds.size === 0) {
        setPendingCount(0);
        return;
      }

      // Count pending join requests for these trips
      const { count, error: countError } = await supabase
        .from('trip_join_requests')
        .select('*', { count: 'exact', head: true })
        .in('trip_id', Array.from(tripIds))
        .eq('status', 'pending');

      if (countError) {
        console.error('Error counting pending requests:', countError);
        setPendingCount(0);
        return;
      }

      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error in useInboundJoinRequests:', error);
      setPendingCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isDemoMode]);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (isDemoMode || !user?.id) return;

    const channel = supabase
      .channel(`inbound_join_requests:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_join_requests'
        },
        () => {
          // Refetch count when any join request changes
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isDemoMode, fetchPendingCount]);

  return {
    pendingCount,
    isLoading,
    refetch: fetchPendingCount
  };
};
