import React from 'react';
import { useJoinRequests } from '@/hooks/useJoinRequests';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserCheck, UserX, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface JoinRequestsPanelProps {
  tripId: string;
}

export const JoinRequestsPanel: React.FC<JoinRequestsPanelProps> = ({ tripId }) => {
  const { requests, isLoading, isProcessing, approveRequest, rejectRequest } = useJoinRequests({
    tripId
  });

  if (isLoading) {
    return (
      <Card className="p-6 bg-background/40 backdrop-blur-sm border-white/10">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading requests...</p>
        </div>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="p-6 bg-background/40 backdrop-blur-sm border-white/10">
        <div className="text-center py-8">
          <UserCheck className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No pending requests 🎉</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-background/40 backdrop-blur-sm border-white/10">
      <div className="flex items-center justify-between mb-6">
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
            className="flex items-center justify-between p-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/10">
                <AvatarImage src={request.profile?.avatar_url} />
                <AvatarFallback className="bg-orange-500/20 text-orange-500 text-sm">
                  {request.profile?.display_name?.[0]?.toUpperCase() ||
                    request.profile?.email?.[0]?.toUpperCase() ||
                    'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col">
                <span className="font-medium text-foreground text-sm">
                  {request.profile?.display_name || request.profile?.email || 'Unknown User'}
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
                disabled={isProcessing}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => rejectRequest(request.id)}
                disabled={isProcessing}
              >
                <UserX className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
