/**
 * Read Receipts Component
 * Shows who has read a message
 */
import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/utils/avatarUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type ReadStatus = {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
  created_at: string;
};

interface TripMember {
  id: string;
  name: string;
  avatar?: string;
}

interface ReadReceiptsProps {
  readStatuses: ReadStatus[];
  totalRecipients: number;
  currentUserId: string;
  tripMembers?: TripMember[];
}

export const ReadReceipts: React.FC<ReadReceiptsProps> = ({
  readStatuses,
  totalRecipients: _totalRecipients,
  currentUserId,
  tripMembers = [],
}) => {
  const readCount = readStatuses.length;
  // const allRead = readCount === totalRecipients; // unused for now

  // Filter out current user's read status from display
  const otherReaders = readStatuses.filter(status => status.user_id !== currentUserId);

  if (readCount === 0) {
    return (
      <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
        <Check size={12} />
        <span>Sent</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1 justify-end">
      <div className="flex -space-x-1.5 overflow-hidden">
        {otherReaders.slice(0, 5).map(status => {
          const member = tripMembers.find(m => m.id === status.user_id);
          const name = member?.name || 'Unknown User';
          const avatarUrl = member?.avatar;

          return (
            <TooltipProvider key={status.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="inline-block h-4 w-4 rounded-full ring-1 ring-background">
                    <AvatarImage src={avatarUrl} alt={name} />
                    <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>Read by {name}</p>
                  <p className="text-[10px] opacity-70">
                    {new Date(status.read_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
        {otherReaders.length > 5 && (
          <div className="flex items-center justify-center h-4 w-4 rounded-full ring-1 ring-background bg-muted text-[8px] text-muted-foreground font-medium">
            +{otherReaders.length - 5}
          </div>
        )}
      </div>

      {/* If no other users read it yet but readCount > 0 (meaning maybe only current user read it? unlikely but possible in edge cases) */}
      {otherReaders.length === 0 && readCount > 0 && (
        <div className="flex items-center gap-1 text-blue-500 text-xs">
          <CheckCheck size={12} />
        </div>
      )}
    </div>
  );
};
