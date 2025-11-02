import React from 'react';
import { ChatMessage } from '@/hooks/useChatComposer';
import { ChatMessageWithGrounding } from '@/types/grounding';
import { MessageBubble } from './MessageBubble';
import { useAuth } from '@/hooks/useAuth';

interface MessageItemProps {
  message: ChatMessage;
  reactions?: Record<string, { count: number; userReacted: boolean }>;
  onReaction: (messageId: string, reactionType: string) => void;
  showSenderInfo?: boolean;
}

export const MessageItem = ({ message, reactions, onReaction, showSenderInfo }: MessageItemProps) => {
  const { user } = useAuth();
  const messageWithGrounding = message as unknown as ChatMessageWithGrounding;
  
  // Handle demo mode: if no user, use 'demo-user' as fallback
  const effectiveUserId = user?.id || 'demo-user';
  const isOwnMessage = effectiveUserId === message.sender.id;
  
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
      // 🆕 Pass grounding data
      grounding={messageWithGrounding.sources || messageWithGrounding.googleMapsWidget ? {
        sources: messageWithGrounding.sources,
        googleMapsWidget: messageWithGrounding.googleMapsWidget
      } : undefined}
    />
  );
};
