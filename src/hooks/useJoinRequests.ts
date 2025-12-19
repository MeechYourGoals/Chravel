import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getMockPendingRequests } from '@/mockData/joinRequests';
import { useDemoTripMembersStore } from '@/store/demoTripMembersStore';

export interface JoinRequest {
  id: string;
  trip_id: string;
  user_id: string;
  invite_code: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  resolved_by?: string;
  resolved_at?: string;
  // Name captured at request creation time (fail-safe, stored in DB)
  requester_name?: string;
  requester_email?: string;
  profile?: {
    display_name: string;
    avatar_url?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}


interface UseJoinRequestsProps {
  tripId: string;
  enabled?: boolean;
  isDemoMode?: boolean;
}

export const useJoinRequests = ({ tripId, enabled = true, isDemoMode = false }: UseJoinRequestsProps) => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!enabled || !tripId) {
      setIsLoading(false);
      return;
    }

    // Demo mode - return mock data
    if (isDemoMode) {
      setRequests(getMockPendingRequests(tripId));
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch requests with the new requester_name and requester_email fields
      // These are captured at request creation time and stored directly in the table
      const { data, error } = await supabase
        .from('trip_join_requests')
        .select('id, trip_id, user_id, invite_code, status, requested_at, resolved_at, resolved_by, requester_name, requester_email')
        .eq('trip_id', tripId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for additional info (avatar, etc.) but NOT as primary name source
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (request) => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, email, first_name, last_name')
            .eq('user_id', request.user_id)
            .maybeSingle();

          if (profileError) {
            console.warn('Failed to fetch profile for user:', request.user_id, profileError);
          }

          // Name resolution priority (fail-safe approach):
          // 1. requester_name from DB (captured at request creation - most reliable)
          // 2. requester_email from DB (fallback captured at request creation)
          // 3. Profile display_name (may be updated after request)
          // 4. Profile first/last name combination
          // 5. Profile email
          // 6. "Unknown User" as last resort
          let finalDisplayName = request.requester_name;

          if (!finalDisplayName) {
            // Fallback to DB-stored email
            finalDisplayName = request.requester_email;
          }

          if (!finalDisplayName && profile) {
            // Fallback to current profile data
            finalDisplayName = profile.display_name;
            if (!finalDisplayName) {
              if (profile.first_name && profile.last_name) {
                finalDisplayName = `${profile.first_name} ${profile.last_name}`;
              } else if (profile.first_name) {
                finalDisplayName = profile.first_name;
              } else if (profile.last_name) {
                finalDisplayName = profile.last_name;
              } else {
                finalDisplayName = profile.email;
              }
            }
          }

          finalDisplayName = finalDisplayName || 'Unknown User';

          return {
            ...request,
            profile: {
              display_name: finalDisplayName,
              avatar_url: profile?.avatar_url,
              email: profile?.email || request.requester_email,
              first_name: profile?.first_name,
              last_name: profile?.last_name
            }
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
  }, [tripId, enabled, isDemoMode]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Subscribe to realtime updates (only in authenticated mode)
  useEffect(() => {
    if (!enabled || !tripId || isDemoMode) return;

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
  }, [tripId, enabled, isDemoMode, fetchRequests]);

  const approveRequest = useCallback(async (requestId: string) => {
    setIsProcessing(true);
    
    // Demo mode - add member to store and update local state
    if (isDemoMode) {
      const request = requests.find(r => r.id === requestId);
      
      if (request) {
        // Add the approved user to the demo trip members store
        const { addMember } = useDemoTripMembersStore.getState();
        addMember(tripId, {
          id: request.user_id,
          name: request.profile?.display_name || 'New Member',
          avatar: request.profile?.avatar_url,
          email: request.profile?.email
        });
      }
      
      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('✅ Request approved - member added to trip!');
      setIsProcessing(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('approve_join_request', {
        _request_id: requestId
      });

      if (error) throw error;

      // Check the response for success/failure
      const result = data as { success: boolean; message: string } | null;
      if (result && !result.success) {
        throw new Error(result.message || 'Failed to approve request');
      }

      toast.success('✅ Request approved');
      await fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve request');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchRequests, isDemoMode, requests, tripId]);

  const rejectRequest = useCallback(async (requestId: string) => {
    setIsProcessing(true);
    
    // Demo mode - just update local state
    if (isDemoMode) {
      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Request rejected');
      setIsProcessing(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('reject_join_request', {
        _request_id: requestId
      });

      if (error) throw error;

      // Check the response for success/failure
      const result = data as { success: boolean; message: string } | null;
      if (result && !result.success) {
        throw new Error(result.message || 'Failed to reject request');
      }

      toast.success('Request rejected');
      await fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject request');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchRequests, isDemoMode]);

  return {
    requests,
    isLoading,
    isProcessing,
    approveRequest,
    rejectRequest,
    refetch: fetchRequests
  };
};
