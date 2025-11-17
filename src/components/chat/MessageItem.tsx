import React, { memo } from 'react';
import { ChatMessage } from '@/hooks/useChatComposer';
import { ChatMessageWithGrounding } from '@/types/grounding';
import { MessageBubble } from './MessageBubble';
import { useAuth } from '@/hooks/useAuth';
import { useCallback } from 'react';

interface MessageItemProps {
  message: ChatMessage;
  reactions?: Record<string, { count: number; userReacted: boolean }>;
  onReaction: (messageId: string, reactionType: string) => void;
  showSenderInfo?: boolean;
}

export const MessageItem = memo(({ message, reactions, onReaction, showSenderInfo }: MessageItemProps) => {
  const { user } = useAuth();
  const messageWithGrounding = message as unknown as ChatMessageWithGrounding;
  
  // Handle demo mode: if no user, use 'demo-user' as fallback
  const effectiveUserId = user?.id || 'demo-user';
  const isOwnMessage = effectiveUserId === message.sender.id;

  const handleEdit = useCallback(async (messageId: string, newContent: string) => {
    // Refresh will happen via real-time subscription or optimistic update
    console.log('Message edited:', messageId, newContent);
  }, []);

  const handleDelete = useCallback(async (messageId: string) => {
    // Refresh will happen via real-time subscription or optimistic update
    console.log('Message deleted:', messageId);
  }, []);
  
  return (
    <MessageBubble
      id={message.id}
      text={message.text}
      senderName={message.sender.name}
      senderAvatar={message.sender.avatar}
      timestamp={message.createdAt}
      isBroadcast={message.isBroadcast}
      isPayment={message.isPayment || message.tags?.includes('payment')}
      isOwnMessage={isOwnMessage}
      reactions={reactions}
      onReaction={onReaction}
      showSenderInfo={showSenderInfo}
      messageType="trip"
      onEdit={handleEdit}
      onDelete={handleDelete}
      // 🆕 Pass grounding data
      grounding={messageWithGrounding.sources || messageWithGrounding.googleMapsWidget ? {
        sources: messageWithGrounding.sources,
        googleMapsWidget: messageWithGrounding.googleMapsWidget
      } : undefined}
    />
  );
});
