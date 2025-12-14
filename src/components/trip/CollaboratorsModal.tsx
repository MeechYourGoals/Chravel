import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { getInitials, isValidAvatarUrl } from '../../utils/avatarUtils';
import { formatCollaboratorName } from '../../utils/nameFormatUtils';
import { UserMinus, Crown, Check, X, Clock, Users, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JoinRequest } from '@/hooks/useJoinRequests';
import { formatDistanceToNow } from 'date-fns';

interface CollaboratorItem {
  id: number | string;
  name: string;
  avatar?: string;
  role?: string;
  isCreator?: boolean;
}

interface CollaboratorsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: CollaboratorItem[];
  tripType?: 'consumer' | 'pro' | 'event';
  currentUserId?: string;
  tripCreatorId?: string | null;
  isAdmin?: boolean;
  onRemoveMember?: (userId: string) => Promise<boolean>;
  // New props for join requests
  pendingRequests?: JoinRequest[];
  onApproveRequest?: (requestId: string) => Promise<void>;
  onRejectRequest?: (requestId: string) => Promise<void>;
  isProcessingRequest?: boolean;
}

type TabType = 'members' | 'requests';

export const CollaboratorsModal: React.FC<CollaboratorsModalProps> = ({
  open,
  onOpenChange,
  participants,
  tripType = 'consumer',
  currentUserId,
  tripCreatorId,
  isAdmin = false,
  onRemoveMember,
  pendingRequests = [],
  onApproveRequest,
  onRejectRequest,
  isProcessingRequest = false,
}) => {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('members');

  const handleRemove = async (userId: string, name: string) => {
    if (!onRemoveMember) return;
    
    const confirmed = window.confirm(`Remove ${name} from this trip?`);
    if (!confirmed) return;

    setRemovingId(userId);
    try {
      await onRemoveMember(userId);
    } finally {
      setRemovingId(null);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!onApproveRequest || isProcessingRequest) return;
    setProcessingRequestId(requestId);
    try {
      await onApproveRequest(requestId);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!onRejectRequest || isProcessingRequest) return;
    setProcessingRequestId(requestId);
    try {
      await onRejectRequest(requestId);
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Can remove if: (is admin OR is current user leaving) AND not the creator
  const canRemove = (collaboratorId: string) => {
    if (!onRemoveMember) return false;
    const idStr = collaboratorId.toString();
    // Can't remove trip creator
    if (idStr === tripCreatorId) return false;
    // Admin can remove anyone (except creator)
    if (isAdmin) return true;
    // Users can remove themselves
    if (idStr === currentUserId) return true;
    return false;
  };

  // Determine who can manage requests:
  // - Consumer trips: ANY trip member can approve/reject
  // - Pro/Event trips: Only admins can approve/reject
  const isConsumerTrip = !tripType || tripType === 'consumer';
  const canManageRequests = (isAdmin || isConsumerTrip) && onApproveRequest && onRejectRequest;
  const pendingCount = pendingRequests.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>All Collaborators</DialogTitle>
        </DialogHeader>

        {/* Tab Navigation - Always visible for consistent UX across all viewports */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mt-2">
          <button
            onClick={() => setActiveTab('members')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all",
              activeTab === 'members'
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Users size={16} />
            <span>Members ({participants.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all relative",
              activeTab === 'requests'
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <UserPlus size={16} />
            <span>Requests</span>
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4 max-h-[60vh] overflow-auto pr-1">
          {activeTab === 'members' ? (
            // Members List
            <div role="list" aria-label="All collaborators">
              {participants.map((c) => {
                const idStr = c.id.toString();
                const isCreator = idStr === tripCreatorId || c.isCreator;
                const isCurrentUser = idStr === currentUserId;
                const showRemoveButton = canRemove(idStr);

                return (
                  <div
                    key={c.id}
                    role="listitem"
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 mb-2",
                      removingId === idStr && "opacity-50"
                    )}
                  >
                    {isValidAvatarUrl(c.avatar) ? (
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="h-9 w-9 rounded-full object-cover border border-white/20"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-white/10 text-white/80 grid place-items-center text-xs font-semibold border border-white/20">
                        {getInitials(c.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-white">
                          {formatCollaboratorName(c.name, tripType)}
                        </span>
                        {isCreator && (
                          <span title="Trip Creator">
                            <Crown size={14} className="text-yellow-500 flex-shrink-0" />
                          </span>
                        )}
                        {isCurrentUser && !isCreator && (
                          <span className="text-xs text-gray-400">(you)</span>
                        )}
                      </div>
                      {c.role && (
                        <div className="truncate text-xs text-gray-400">{c.role}</div>
                      )}
                    </div>
                    
                    {/* Remove button */}
                    {showRemoveButton && (
                      <button
                        onClick={() => handleRemove(idStr, c.name)}
                        disabled={removingId === idStr}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title={isCurrentUser ? "Leave trip" : "Remove from trip"}
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
              {participants.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No members yet
                </div>
              )}
            </div>
          ) : (
            // Pending Requests List - Show different content for admins vs non-admins
            <div role="list" aria-label="Pending join requests">
              {canManageRequests ? (
                // Admin view: can approve/reject requests
                pendingRequests.length > 0 ? (
                  pendingRequests.map((request) => {
                    const isProcessing = processingRequestId === request.id;
                    const displayName = request.profile?.display_name || request.profile?.email || 'Unknown User';
                    const timeAgo = formatDistanceToNow(new Date(request.requested_at), { addSuffix: true });

                    return (
                      <div
                        key={request.id}
                        role="listitem"
                        className={cn(
                          "flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-3 mb-2",
                          isProcessing && "opacity-50"
                        )}
                      >
                        {/* Avatar */}
                        {isValidAvatarUrl(request.profile?.avatar_url) ? (
                          <img
                            src={request.profile?.avatar_url}
                            alt={displayName}
                            className="h-10 w-10 rounded-full object-cover border border-white/20"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white grid place-items-center text-sm font-semibold border border-white/20">
                            {getInitials(displayName)}
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {displayName}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={12} />
                            <span>Requested {timeAgo}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(request.id)}
                            disabled={isProcessing}
                            className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 hover:text-green-300 rounded-lg transition-colors disabled:opacity-50"
                            title="Approve request"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            disabled={isProcessing}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg transition-colors disabled:opacity-50"
                            title="Reject request"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <UserPlus size={24} className="text-gray-500" />
                    </div>
                    <p className="text-gray-400 text-sm">No pending requests</p>
                    <p className="text-gray-500 text-xs mt-1">
                      When someone requests to join, they'll appear here
                    </p>
                  </div>
                )
              ) : (
              // Non-admin view: informational message (Pro/Event trips only)
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <UserPlus size={24} className="text-gray-500" />
                  </div>
                  <p className="text-gray-400 text-sm">Join Requests</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Only trip admins can manage join requests for Pro/Event trips
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
