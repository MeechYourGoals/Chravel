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
  requester_name?: string | null;
  requester_email?: string | null;
  requester_avatar_url?: string | null;
  profile?: {
    display_name: string;
    avatar_url?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };
}

interface UseJoinRequestsProps {
  tripId: string;
  enabled?: boolean;
  isDemoMode?: boolean;
}

export const useJoinRequests = ({
  tripId,
  enabled = true,
  isDemoMode = false,
}: UseJoinRequestsProps) => {
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

      // Fetch pending join requests - include requester_name/email fallback fields
      const { data, error } = await supabase
        .from('trip_join_requests')
        .select(
          'id, trip_id, user_id, invite_code, status, requested_at, resolved_at, resolved_by, requester_name, requester_email, requester_avatar_url',
        )
        .eq('trip_id', tripId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      console.log('[useJoinRequests] Fetched raw requests:', data?.length);

      // Fetch profiles for user info (use public view for co-member data)
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async request => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles_public')
            .select('display_name, avatar_url, first_name, last_name')
            .eq('user_id', request.user_id)
            .maybeSingle();

          if (profileError) {
            console.warn(
              '[useJoinRequests] Failed to fetch profile for user:',
              request.user_id,
              profileError,
            );
          }

          // CRITICAL FIX: Do NOT filter out requests when profile is missing!
          // Use stored requester_name/email as fallback
          // Name resolution priority:
          // 1. Profile display_name
          // 2. Profile first/last name combination
          // 3. Stored requester_name from join request (captured at request time)
          // 4. Stored requester_email from join request
          // 5. "New member" as last resort
          let finalDisplayName: string | null = null;

          if (profile) {
            finalDisplayName = profile.display_name;
            if (!finalDisplayName) {
              if (profile.first_name && profile.last_name) {
                finalDisplayName = `${profile.first_name} ${profile.last_name}`;
              } else if (profile.first_name) {
                finalDisplayName = profile.first_name;
              } else if (profile.last_name) {
                finalDisplayName = profile.last_name;
              }
            }
          }

          // Fallback to stored request fields if profile data unavailable
          if (!finalDisplayName) {
            finalDisplayName =
              request.requester_name || request.requester_email?.split('@')[0] || 'New member';
          }

          return {
            ...request,
            profile: {
              display_name: finalDisplayName,
              avatar_url: profile?.avatar_url || request.requester_avatar_url || null,
              first_name: profile?.first_name || null,
              last_name: profile?.last_name || null,
            },
          };
        }),
      );

      console.log(
        '[useJoinRequests] Processed requests with profiles:',
        requestsWithProfiles.length,
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
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          fetchRequests();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, enabled, isDemoMode, fetchRequests]);

  const approveRequest = useCallback(
    async (requestId: string) => {
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
          });
        }

        setRequests(prev => prev.filter(r => r.id !== requestId));
        toast.success('✅ Request approved - member added to trip!');
        setIsProcessing(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('approve_join_request', {
          _request_id: requestId,
        });

        if (error) throw error;

        // Check the response for success/failure
        const result = data as { success: boolean; message: string; cleaned_up?: boolean } | null;

        if (result && !result.success) {
          // If the request was cleaned up (orphaned user), show info message and refresh
          if (result.cleaned_up) {
            toast.info(result.message || 'This request is no longer valid');
            await fetchRequests();
            return;
          }
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
    },
    [fetchRequests, isDemoMode, requests, tripId],
  );

  const rejectRequest = useCallback(
    async (requestId: string) => {
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
          _request_id: requestId,
        });

        if (error) throw error;

        // Check the response for success/failure
        const result = data as { success: boolean; message: string; cleaned_up?: boolean } | null;

        if (result && !result.success) {
          throw new Error(result.message || 'Failed to reject request');
        }

        // Show appropriate message based on whether it was a cleanup or normal rejection
        if (result?.cleaned_up) {
          toast.info(result.message || 'Invalid request removed');
        } else {
          toast.success('Request rejected');
        }

        await fetchRequests();
      } catch (error) {
        console.error('Error rejecting request:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to reject request');
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [fetchRequests, isDemoMode],
  );

  /**
   * Dismiss a join request - permanently removes it without approval/rejection.
   * Used for swipe-to-delete functionality.
   * Useful for:
   * - Orphaned requests from deleted users
   * - Spam or unwanted requests
   * - "Request purgatory" - neither approving nor denying
   */
  const dismissRequest = useCallback(
    async (requestId: string) => {
      setIsProcessing(true);

      // Demo mode - just update local state
      if (isDemoMode) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
        toast.success('Request dismissed');
        setIsProcessing(false);
        return;
      }

      try {
        // Typed RPC shim until types.ts is regenerated
        const rpc = supabase.rpc as <T>(
          fn: string,
          params?: Record<string, string>,
        ) => Promise<{ data: T | null; error: { message?: string } | null }>;

        const { data, error } = await rpc<{
          success: boolean;
          message: string;
          cleaned_up?: boolean;
        }>('dismiss_join_request', { _request_id: requestId });

        if (error) throw error;

        // Check the response for success/failure
        if (data && !data.success) {
          throw new Error(data.message || 'Failed to dismiss request');
        }

        // Show appropriate message
        if (data?.cleaned_up) {
          toast.info(data.message || 'Orphaned request removed');
        } else {
          toast.success('Request dismissed');
        }

        await fetchRequests();
      } catch (error) {
        console.error('Error dismissing request:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to dismiss request');
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [fetchRequests, isDemoMode],
  );

  return {
    requests,
    isLoading,
    isProcessing,
    approveRequest,
    rejectRequest,
    dismissRequest,
    refetch: fetchRequests,
  };
};
