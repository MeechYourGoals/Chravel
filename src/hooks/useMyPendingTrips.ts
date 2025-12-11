import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PendingTripRequest {
  id: string;
  trip_id: string;
  requested_at: string;
  trip?: {
    id: string;
    name: string;
    destination: string;
    start_date: string;
    cover_image_url?: string;
  };
}

export const useMyPendingTrips = () => {
  const { user } = useAuth();
  const [pendingTrips, setPendingTrips] = useState<PendingTripRequest[]>([]);
  // Only start in loading state if there's a user to fetch for
  const [isLoading, setIsLoading] = useState(!!user?.id);

  const fetchPendingTrips = useCallback(async () => {
    if (!user?.id) {
      setPendingTrips([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch pending join requests for current user
      const { data: requests, error } = await supabase
        .from('trip_join_requests')
        .select(`
          id,
          trip_id,
          requested_at,
          trips!inner (
            id,
            name,
            destination,
            start_date,
            cover_image_url
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending trips:', error);
        setPendingTrips([]);
        return;
      }

      // Transform the data to flatten the trips relation
      const transformedRequests: PendingTripRequest[] = (requests || []).map((req: any) => ({
        id: req.id,
        trip_id: req.trip_id,
        requested_at: req.requested_at,
        trip: req.trips ? {
          id: req.trips.id,
          name: req.trips.name,
          destination: req.trips.destination,
          start_date: req.trips.start_date,
          cover_image_url: req.trips.cover_image_url
        } : undefined
      }));

      setPendingTrips(transformedRequests);
    } catch (error) {
      console.error('Error in useMyPendingTrips:', error);
      setPendingTrips([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPendingTrips();
  }, [fetchPendingTrips]);

  // Subscribe to realtime updates for join request status changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`my_join_requests:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_join_requests',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchPendingTrips();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchPendingTrips]);

  return {
    pendingTrips,
    isLoading,
    refetch: fetchPendingTrips
  };
};
