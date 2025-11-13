import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface JoinRequest {
  id: string;
  trip_id: string;
  user_id: string;
  invite_code: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  resolved_by?: string;
  resolved_at?: string;
  profile?: {
    display_name: string;
    avatar_url?: string;
    email?: string;
  };
}

interface UseJoinRequestsProps {
  tripId: string;
  enabled?: boolean;
}

export const useJoinRequests = ({ tripId, enabled = true }: UseJoinRequestsProps) => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!enabled || !tripId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('trip_join_requests')
        .select('*')
        .eq('trip_id', tripId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (request) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, email')
            .eq('user_id', request.user_id)
            .single();

          return {
            ...request,
            profile: profile || undefined
          };
        })
      );

      setRequests(requestsWithProfiles as JoinRequest[]);
    } catch (error) {
      console.error('Error fetching join requests:', error);
      toast.error('Failed to load join requests');
    } finally {
      setIsLoading(false);
    }
  }, [tripId, enabled]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!enabled || !tripId) return;

    const channel = supabase
      .channel(`trip_join_requests:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_join_requests',
          filter: `trip_id=eq.${tripId}`
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, enabled, fetchRequests]);

  const approveRequest = useCallback(async (requestId: string) => {
    setIsProcessing(true);
    
    try {
      const { error } = await supabase.rpc('approve_join_request' as any, {
        _request_id: requestId
      });

      if (error) throw error;

      toast.success('✅ Request approved');
      await fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve request');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchRequests]);

  const rejectRequest = useCallback(async (requestId: string) => {
    setIsProcessing(true);
    
    try {
      const { error } = await supabase.rpc('reject_join_request' as any, {
        _request_id: requestId
      });

      if (error) throw error;

      toast.success('Request rejected');
      await fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject request');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchRequests]);

  return {
    requests,
    isLoading,
    isProcessing,
    approveRequest,
    rejectRequest,
    refetch: fetchRequests
  };
};
