import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { getInitials, isValidAvatarUrl } from '../../utils/avatarUtils';
import { formatCollaboratorName } from '../../utils/nameFormatUtils';

interface CollaboratorItem {
  id: number | string;
  name: string;
  avatar?: string;
  role?: string;
}

interface CollaboratorsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: CollaboratorItem[];
  tripType?: 'consumer' | 'pro' | 'event';
}

export const CollaboratorsModal: React.FC<CollaboratorsModalProps> = ({
  open,
  onOpenChange,
  participants,
  tripType = 'consumer',
}) => {
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
          {participants.map((c) => (
            <div
              key={c.id}
              role="listitem"
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 mb-2"
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
                <div className="truncate text-sm font-medium text-white">{formatCollaboratorName(c.name, tripType)}</div>
                {c.role && (
                  <div className="truncate text-xs text-gray-400">{c.role}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
