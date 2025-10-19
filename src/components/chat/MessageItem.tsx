import React from 'react';
import { ChatMessage } from '@/hooks/useChatComposer';
import { ChatMessageWithGrounding } from '@/types/grounding';
import { MessageBubble } from './MessageBubble';

interface MessageItemProps {
  message: ChatMessage;
  reactions?: Record<string, { count: number; userReacted: boolean }>;
  onReaction: (messageId: string, reactionType: string) => void;
}

export const MessageItem = ({ message, reactions, onReaction }: MessageItemProps) => {
  const messageWithGrounding = message as unknown as ChatMessageWithGrounding;
  
  return (
    <MessageBubble
      id={message.id}
      text={message.text}
      senderName={message.sender.name}
      senderAvatar={message.sender.avatar}
      timestamp={message.createdAt}
      isBroadcast={message.isBroadcast}
      isPayment={message.isPayment || message.tags?.includes('payment')}
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
