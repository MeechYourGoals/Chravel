import React from 'react';
import { ChatMessage } from '@/hooks/useChatComposer';
import { ChatMessageWithGrounding } from '@/types/grounding';
import { MessageBubble } from './MessageBubble';
import { useAuth } from '@/hooks/useAuth';

interface MessageItemProps {
  message: ChatMessage;
  reactions?: Record<string, { count: number; userReacted: boolean }>;
  onReaction: (messageId: string, reactionType: string) => void;
}

export const MessageItem = ({ message, reactions, onReaction }: MessageItemProps) => {
  const { user } = useAuth();
  const messageWithGrounding = message as unknown as ChatMessageWithGrounding;
  const isOwnMessage = user?.id === message.sender.id;
  
  // Debug logging for alignment verification
  console.log('MessageItem:', {
    currentUserId: user?.id,
    messageSenderId: message.sender.id,
    isOwnMessage,
    messageText: message.text.substring(0, 30)
  });
  
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
      // 🆕 Pass grounding data
      grounding={messageWithGrounding.sources || messageWithGrounding.googleMapsWidget ? {
        sources: messageWithGrounding.sources,
        googleMapsWidget: messageWithGrounding.googleMapsWidget
      } : undefined}
    />
  );
};
