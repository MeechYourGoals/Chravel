import React from 'react';
import { MessageCircle } from 'lucide-react';
import { MessageItem } from './MessageItem';
import { ChatMessage } from '@/hooks/useChatComposer';

interface MessageListProps {
  messages: ChatMessage[];
  reactions: Record<string, Record<string, { count: number; userReacted: boolean }>>;
  onReaction: (messageId: string, reactionType: string) => void;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

export const MessageList = ({
  messages,
  reactions,
  onReaction,
  emptyStateTitle = "Start the conversation",
  emptyStateDescription = "Messages here are visible to everyone in the trip"
}: MessageListProps) => {
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
    <div className="space-y-2">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          reactions={reactions[message.id]}
          onReaction={onReaction}
        />
      ))}
    </div>
  );
};
