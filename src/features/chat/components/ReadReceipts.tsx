/**
 * Read Receipts Component
 * Shows who has read a message
 */
import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

type ReadStatus = {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
  created_at: string;
};

interface ReadReceiptsProps {
  readStatuses: ReadStatus[];
  totalRecipients: number;
  currentUserId: string;
}

export const ReadReceipts: React.FC<ReadReceiptsProps> = ({
  readStatuses,
  totalRecipients,
  currentUserId,
}) => {
  const readCount = readStatuses.length;
  const allRead = readCount === totalRecipients;
  const isReadByCurrentUser = readStatuses.some(status => status.user_id === currentUserId);

  if (readCount === 0) {
    return (
      <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
        <Check size={12} />
        <span>Sent</span>
      </div>
    );
  }

  if (allRead) {
    return (
      <div className="flex items-center gap-1 text-blue-500 text-xs mt-1">
        <CheckCheck size={12} />
        <span>Read by all</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
      <CheckCheck size={12} />
      <span>
        Read by {readCount} of {totalRecipients}
      </span>
    </div>
  );
};
