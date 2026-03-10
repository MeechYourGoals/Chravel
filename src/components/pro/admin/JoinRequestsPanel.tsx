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
import { UserCheck, UserX, Clock, AlertCircle, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface JoinRequestsPanelProps {
  tripId: string;
}

export const JoinRequestsPanel: React.FC<JoinRequestsPanelProps> = ({ tripId }) => {
  const { requests, isLoading, isProcessing, approveRequest, rejectRequest } = useJoinRequests({
    tripId,
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
          <div className="animate-spin h-5 w-5 gold-gradient-spinner" />
          <p className="text-sm text-muted-foreground">Loading requests...</p>
        </div>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="p-8 bg-background/40 backdrop-blur-sm border-white/10">
        <div className="text-center py-6">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-7 h-7 text-amber-400/60" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">All caught up</p>
          <p className="text-xs text-muted-foreground">No pending requests at this time</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-background/40 backdrop-blur-sm border-white/10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-foreground">Pending Join Requests</h3>
          <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full font-medium">
            {requests.length}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {requests.map(request => (
          <div
            key={request.id}
            className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/[0.07] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-amber-500/20">
                <AvatarImage src={request.profile?.avatar_url} />
                <AvatarFallback className="bg-amber-500/15 text-amber-400 text-sm">
                  {request.profile?.display_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col">
                <span className="font-medium text-foreground text-sm">
                  {request.profile?.display_name || 'Former Member'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Requested{' '}
                  {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleApproveClick(request.id, request.profile?.display_name || 'this user')
                }
                disabled={isProcessing}
                className="rounded-full border-white/20 hover:bg-green-500/10 hover:border-green-500/40 hover:text-green-400 h-8 px-3"
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleRejectClick(request.id, request.profile?.display_name || 'this user')
                }
                disabled={isProcessing}
                className="rounded-full border-white/20 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 h-8 px-3"
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
        <AlertDialogContent className="bg-background border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {pendingAction?.type === 'approve' ? (
                <>
                  <UserCheck className="w-5 h-5 text-green-500" />
                  Approve Join Request?
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Reject Join Request?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {pendingAction?.type === 'approve' ? (
                <>
                  You're about to approve <strong>{pendingAction.userName}</strong> to join this
                  trip. They will be added as a member and can access all trip content based on
                  their assigned role.
                </>
              ) : (
                <>
                  You're about to reject <strong>{pendingAction?.userName}</strong>'s request to
                  join this trip. They will be notified that their request was not approved.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing} className="rounded-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`rounded-full ${
                pendingAction?.type === 'approve'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 gold-gradient-spinner" />
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
