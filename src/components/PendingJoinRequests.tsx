import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, UserCheck, UserX, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JoinRequest {
  id: string;
  trip_id: string;
  user_id: string;
  invite_code: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  requester_name?: string;
  requester_email?: string;
  profiles?: {
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface PendingJoinRequestsProps {
  tripId: string;
}

export const PendingJoinRequests = ({ tripId }: PendingJoinRequestsProps) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (user && tripId) {
      fetchRequests();
    }
  }, [user, tripId]);

  const fetchRequests = async () => {
    try {
      // Fetch requests - only select columns that exist in the table
      const { data: requestsData, error: requestsError } = await supabase
        .from('trip_join_requests')
        .select('id, trip_id, user_id, invite_code, status, requested_at, resolved_at, resolved_by')
        .eq('trip_id', tripId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch profiles separately
      if (requestsData && requestsData.length > 0) {
        const userIds = requestsData.map(r => r.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, email, avatar_url')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        // Merge data
        const mergedData = requestsData.map(request => {
          const profile = profilesData?.find(p => p.user_id === request.user_id);
          
          // Determine display name from profile
          const displayName = profile?.display_name || profile?.email || 'Unknown User';
          
          return {
            ...request,
            profiles: {
              display_name: displayName,
              email: profile?.email || null,
              avatar_url: profile?.avatar_url || null
            }
          };
        });

        setRequests(mergedData as JoinRequest[]);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
      toast.error('Failed to load join requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const { data, error } = await supabase.functions.invoke('approve-join-request', {
        body: { requestId, action: 'approve' }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setRequests(prev => prev.filter(r => r.id !== requestId));
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const { data, error } = await supabase.functions.invoke('approve-join-request', {
        body: { requestId, action: 'reject' }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setRequests(prev => prev.filter(r => r.id !== requestId));
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center p-8 bg-muted/50 rounded-lg">
        <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No pending join requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pending Join Requests</h3>
      {requests.map((request) => (
        <div
          key={request.id}
          className="flex items-center justify-between p-4 bg-card border rounded-lg"
        >
          <div className="flex items-center gap-4">
            {request.profiles?.avatar_url ? (
              <img
                src={request.profiles.avatar_url}
                alt={request.profiles.display_name || 'User'}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {request.profiles?.display_name?.[0] || request.profiles?.email?.[0] || 'U'}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium">
                {request.profiles?.display_name || request.profiles?.email || 'Unknown User'}
              </p>
              <p className="text-sm text-muted-foreground">
                Requested {new Date(request.requested_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleApprove(request.id)}
              disabled={processing === request.id}
            >
              {processing === request.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReject(request.id)}
              disabled={processing === request.id}
            >
              {processing === request.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
