import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { retryWithBackoff } from '@/utils/retryWithBackoff';

export interface JoinRequest {
  id: string;
  trip_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  user_profile?: {
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
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!enabled || !tripId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('trip_join_requests')
        .select(`
          *,
          user_profile:profiles!trip_join_requests_user_id_fkey(
            display_name,
            avatar_url,
            email
          )
        `)
        .eq('trip_id', tripId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
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
      .channel(`join_requests:${tripId}`)
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
    setIsProcessing(requestId);
    
    try {
      const result = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase.rpc('approve_join_request', {
            _request_id: requestId
          });

          if (error) throw error;
          
          const response = data as { success: boolean; message: string };
          if (!response.success) {
            throw new Error(response.message);
          }

          return response;
        },
        {
          maxRetries: 2,
          onRetry: (attempt) => {
            console.log(`Retrying approve request, attempt ${attempt}`);
          }
        }
      );

      toast.success('✅ Join request approved');
      
      // Optimistically remove from list
      setRequests(prev => prev.filter(r => r.id !== requestId));
      
      return result;
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request. Please try again.');
      throw error;
    } finally {
      setIsProcessing(null);
    }
  }, []);

  const rejectRequest = useCallback(async (requestId: string) => {
    setIsProcessing(requestId);
    
    try {
      const result = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase.rpc('reject_join_request', {
            _request_id: requestId
          });

          if (error) throw error;
          
          const response = data as { success: boolean; message: string };
          if (!response.success) {
            throw new Error(response.message);
          }

          return response;
        },
        {
          maxRetries: 2,
          onRetry: (attempt) => {
            console.log(`Retrying reject request, attempt ${attempt}`);
          }
        }
      );

      toast.success('Request rejected');
      
      // Optimistically remove from list
      setRequests(prev => prev.filter(r => r.id !== requestId));
      
      return result;
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request. Please try again.');
      throw error;
    } finally {
      setIsProcessing(null);
    }
  }, []);

  return {
    requests,
    isLoading,
    isProcessing,
    approveRequest,
    rejectRequest,
    refetch: fetchRequests
  };
};
