import React, { useState } from 'react';
import { useJoinRequests } from '@/hooks/useJoinRequests';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserCheck, UserX, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface JoinRequestsPanelProps {
  tripId: string;
}

export const JoinRequestsPanel: React.FC<JoinRequestsPanelProps> = ({ tripId }) => {
  const { requests, isLoading, isProcessing, approveRequest, rejectRequest } = useJoinRequests({
    tripId
  });

  const [pendingAction, setPendingAction] = useState<{
    type: 'approve' | 'reject';
    requestId: string;
    userName: string;
  } | null>(null);

  const handleApproveClick = (requestId: string, userName: string) => {
    setPendingAction({ type: 'approve', requestId, userName });
  };

  const handleRejectClick = (requestId: string, userName: string) => {
    setPendingAction({ type: 'reject', requestId, userName });
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;

    try {
      if (pendingAction.type === 'approve') {
        await approveRequest(pendingAction.requestId);
      } else {
        await rejectRequest(pendingAction.requestId);
      }
    } finally {
      setPendingAction(null);
    }
  };

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
                  {request.profile?.display_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col">
                <span className="font-medium text-foreground text-sm">
                  {request.profile?.display_name || 'Former Member'}
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
                onClick={() =>
                  handleApproveClick(
                    request.id,
                    request.profile?.display_name || 'this user'
                  )
                }
                disabled={isProcessing}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  handleRejectClick(
                    request.id,
                    request.profile?.display_name || 'this user'
                  )
                }
                disabled={isProcessing}
              >
                <UserX className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!pendingAction} onOpenChange={() => setPendingAction(null)}>
        <AlertDialogContent className="bg-background/95 backdrop-blur-xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {pendingAction?.type === 'approve' ? (
                <>
                  <UserCheck className="w-5 h-5 text-green-500" />
                  Approve Join Request?
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  Reject Join Request?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {pendingAction?.type === 'approve' ? (
                <>
                  You're about to approve <strong>{pendingAction.userName}</strong> to join this trip.
                  They will be added as a member and can access all trip content based on their assigned
                  role.
                </>
              ) : (
                <>
                  You're about to reject <strong>{pendingAction?.userName}</strong>'s request to join this
                  trip. They will be notified that their request was not approved.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isProcessing}
              className={
                pendingAction?.type === 'approve'
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-destructive hover:bg-destructive/90'
              }
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Processing...
                </div>
              ) : pendingAction?.type === 'approve' ? (
                'Approve Request'
              ) : (
                'Reject Request'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
