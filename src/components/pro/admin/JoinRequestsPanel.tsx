import React from 'react';
import { useJoinRequests } from '@/hooks/useJoinRequests';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, X, Clock, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface JoinRequestsPanelProps {
  tripId: string;
  isAdmin: boolean;
}

export const JoinRequestsPanel: React.FC<JoinRequestsPanelProps> = ({ tripId, isAdmin }) => {
  const { requests, isLoading, isProcessing, approveRequest, rejectRequest } = useJoinRequests({
    tripId,
    enabled: isAdmin
  });

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="p-6 bg-background/40 backdrop-blur-sm border-white/10">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading join requests...</p>
        </div>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="p-6 bg-background/40 backdrop-blur-sm border-white/10">
        <div className="flex flex-col items-center justify-center text-center py-4">
          <Users className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No Pending Requests</h3>
          <p className="text-sm text-muted-foreground">
            All join requests have been processed 🎉
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-background/40 backdrop-blur-sm border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-foreground">Pending Join Requests</h3>
          <span className="text-xs bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full">
            {requests.length}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between p-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/10">
                <AvatarImage src={request.user_profile?.avatar_url} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {request.user_profile?.display_name?.[0]?.toUpperCase() || 
                   request.user_profile?.email?.[0]?.toUpperCase() || 
                   'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col">
                <span className="font-medium text-foreground text-sm">
                  {request.user_profile?.display_name || request.user_profile?.email || 'Unknown User'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Requested {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => approveRequest(request.id)}
                disabled={isProcessing === request.id}
                className="rounded-full bg-green-600 hover:bg-green-700 text-white border-0 h-9 px-4"
              >
                {isProcessing === request.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => rejectRequest(request.id)}
                disabled={isProcessing === request.id}
                className="rounded-full border-white/20 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 h-9 px-4"
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
