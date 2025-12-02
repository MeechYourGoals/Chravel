import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { getInitials, isValidAvatarUrl } from '../../utils/avatarUtils';
import { formatCollaboratorName } from '../../utils/nameFormatUtils';
import { UserMinus, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

export const CollaboratorsModal: React.FC<CollaboratorsModalProps> = ({
  open,
  onOpenChange,
  participants,
  tripType = 'consumer',
  currentUserId,
  tripCreatorId,
  isAdmin = false,
  onRemoveMember,
}) => {
  const [removingId, setRemovingId] = useState<string | null>(null);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>All Collaborators ({participants.length})</DialogTitle>
        </DialogHeader>
        <div
          role="list"
          aria-label="All collaborators"
          className="mt-4 max-h-[70vh] overflow-auto pr-1"
        >
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
