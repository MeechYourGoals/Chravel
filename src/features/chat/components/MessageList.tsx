import React, { useMemo, memo } from 'react';
import { MessageCircle } from 'lucide-react';
import { MessageItem } from './MessageItem';
import { ChatMessage } from '../hooks/useChatComposer';

interface MessageListProps {
  messages: (ChatMessage & { status?: 'sending' | 'sent' | 'failed' })[];
  reactions: Record<string, Record<string, { count: number; userReacted: boolean }>>;
  onReaction: (messageId: string, reactionType: string) => void;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  onRetryMessage?: (messageId: string) => void;
  tripMembers?: Array<{ id: string; name: string; avatar?: string }>; // Pass trip members
  readStatuses?: Record<string, any[]>; // Pass read statuses map
}

export const MessageList = memo(
  ({
    messages,
    reactions,
    onReaction,
    emptyStateTitle = 'Start the conversation',
    emptyStateDescription = 'Messages here are visible to everyone in the trip',
    onRetryMessage,
    tripMembers,
    readStatuses = {},
  }: MessageListProps) => {
    // Memoize message grouping for performance
    const messageGroups = useMemo(() => {
      return messages.map((message, index) => {
        const previousMessage = messages[index - 1];
        const isSameSender = previousMessage && previousMessage.sender.id === message.sender.id;
        return {
          message,
          showSenderInfo: !isSameSender,
          marginClass: isSameSender ? 'mt-1' : 'mt-4',
        };
      });
    }, [messages]);

    if (messages.length === 0) {
      return (
        <div className="text-center py-8">
          <MessageCircle size={48} className="text-slate-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-400 mb-2">{emptyStateTitle}</h4>
          <p className="text-slate-500 text-sm">{emptyStateDescription}</p>
        </div>
      );
    }

    return (
      <div>
        {messageGroups.map(({ message, showSenderInfo, marginClass }) => (
          <div key={message.id} className={marginClass}>
            <MessageItem
              message={message}
              reactions={reactions[message.id]}
              onReaction={onReaction}
              showSenderInfo={showSenderInfo}
              onRetry={onRetryMessage}
              tripMembers={tripMembers}
              readStatuses={readStatuses[message.id]}
            />
          </div>
        ))}
      </div>
    );
  },
);
