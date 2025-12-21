import React, { memo, useCallback } from 'react';
import { ChatMessage } from '@/hooks/useChatComposer';
import { ChatMessageWithGrounding } from '@/types/grounding';
import { MessageBubble } from './MessageBubble';
import { SystemMessageBubble } from './SystemMessageBubble';
import { useAuth } from '@/hooks/useAuth';
import { shouldShowSystemMessage, DEFAULT_SYSTEM_MESSAGE_CATEGORIES, SystemMessageCategoryPrefs } from '@/utils/systemMessageCategory';

interface MessageItemProps {
  message: ChatMessage & { status?: 'sending' | 'sent' | 'failed' };
  reactions?: Record<string, { count: number; userReacted: boolean }>;
  onReaction: (messageId: string, reactionType: string) => void;
  showSenderInfo?: boolean;
  onRetry?: (messageId: string) => void;
  // System message visibility preferences
  systemMessagePrefs?: {
    showSystemMessages: boolean;
    categories: SystemMessageCategoryPrefs;
  };
}

export const MessageItem = memo(({ 
  message, 
  reactions, 
  onReaction, 
  showSenderInfo, 
  onRetry,
  systemMessagePrefs 
}: MessageItemProps) => {
  const { user } = useAuth();
  const messageWithGrounding = message as unknown as ChatMessageWithGrounding;

  // Check for system messages
  const isSystemMessage = message.tags?.includes('system') === true || 
    (message as any).message_type === 'system';
  
  // Filter system messages based on preferences
  if (isSystemMessage && systemMessagePrefs) {
    const eventType = (message as any).system_event_type;
    if (!shouldShowSystemMessage(
      systemMessagePrefs.showSystemMessages,
      systemMessagePrefs.categories,
      eventType
    )) {
      return null; // Hide this system message
    }
  }
  
  // Determine if message is from current user
  const senderUserId = (message.sender as any).userId || message.sender.id;
  const isOwnMessage = user?.id 
    ? (senderUserId === user.id || message.sender.id === user.id || message.sender.name === (user.displayName || user.email?.split('@')[0]))
    : false;

  const handleEdit = useCallback(async (messageId: string, newContent: string) => {
    console.log('Message edited:', messageId, newContent);
  }, []);

  const handleDelete = useCallback(async (messageId: string) => {
    console.log('Message deleted:', messageId);
  }, []);
  
  const messageWithMedia = message as any;

  if (isSystemMessage) {
    return (
      <SystemMessageBubble
        body={message.text}
        timestamp={message.createdAt}
      />
    );
  }
  
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
      isEdited={(message as any).isEdited || false}
      reactions={reactions}
      onReaction={onReaction}
      showSenderInfo={showSenderInfo}
      messageType="trip"
      onEdit={handleEdit}
      onDelete={handleDelete}
      grounding={messageWithGrounding.sources || messageWithGrounding.googleMapsWidget ? {
        sources: messageWithGrounding.sources,
        googleMapsWidget: messageWithGrounding.googleMapsWidget
      } : undefined}
      mediaType={messageWithMedia.mediaType}
      mediaUrl={messageWithMedia.mediaUrl}
      linkPreview={messageWithMedia.linkPreview}
      attachments={messageWithMedia.attachments}
      status={message.status}
      onRetry={onRetry}
    />
  );
});
