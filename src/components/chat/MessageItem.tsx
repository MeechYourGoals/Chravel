import React, { memo } from 'react';
import { ChatMessage } from '@/hooks/useChatComposer';
import { ChatMessageWithGrounding } from '@/types/grounding';
import { MessageBubble } from './MessageBubble';
import { useAuth } from '@/hooks/useAuth';
import { useCallback } from 'react';

interface MessageItemProps {
  message: ChatMessage & { status?: 'sending' | 'sent' | 'failed' };
  reactions?: Record<string, { count: number; userReacted: boolean }>;
  onReaction: (messageId: string, reactionType: string) => void;
  showSenderInfo?: boolean;
  onRetry?: (messageId: string) => void;
}

export const MessageItem = memo(({ message, reactions, onReaction, showSenderInfo, onRetry }: MessageItemProps) => {
  const { user } = useAuth();
  const messageWithGrounding = message as unknown as ChatMessageWithGrounding;

  const isSystemMessage = message.tags?.includes('system') === true;
  
  // Determine if message is from current user
  // Check by user ID first (most reliable), then fall back to author name match
  const senderUserId = (message.sender as any).userId || message.sender.id;
  const isOwnMessage = user?.id 
    ? (senderUserId === user.id || message.sender.id === user.id || message.sender.name === (user.displayName || user.email?.split('@')[0]))
    : false;

  const handleEdit = useCallback(async (messageId: string, newContent: string) => {
    // Refresh will happen via real-time subscription or optimistic update
    console.log('Message edited:', messageId, newContent);
  }, []);

  const handleDelete = useCallback(async (messageId: string) => {
    // Refresh will happen via real-time subscription or optimistic update
    console.log('Message deleted:', messageId);
  }, []);
  
  // Extract media data from message
  const messageWithMedia = message as any;

  if (isSystemMessage) {
    return (
      <div className="flex justify-center px-3 py-2">
        <div className="max-w-[90%] rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs md:text-sm italic text-white/70 select-none">
          {message.text}
        </div>
      </div>
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
      // 🆕 Pass grounding data
      grounding={messageWithGrounding.sources || messageWithGrounding.googleMapsWidget ? {
        sources: messageWithGrounding.sources,
        googleMapsWidget: messageWithGrounding.googleMapsWidget
      } : undefined}
      // 🆕 Pass rich media data
      mediaType={messageWithMedia.mediaType}
      mediaUrl={messageWithMedia.mediaUrl}
      linkPreview={messageWithMedia.linkPreview}
      attachments={messageWithMedia.attachments}
      status={message.status}
      onRetry={onRetry}
    />
  );
});
