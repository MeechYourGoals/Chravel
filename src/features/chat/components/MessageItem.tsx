import React, { memo, useCallback } from 'react';
import { ChatMessage } from '../hooks/useChatComposer';
import { ChatMessageWithGrounding } from '@/types/grounding';
import { MessageBubble } from './MessageBubble';
import { SystemMessageBubble } from './SystemMessageBubble';
import { useAuth } from '@/hooks/useAuth';
import {
  shouldShowSystemMessage,
  DEFAULT_SYSTEM_MESSAGE_CATEGORIES,
  SystemMessageCategoryPrefs,
} from '@/utils/systemMessageCategory';
import { ReadReceipts } from './ReadReceipts';

interface MessageItemProps {
  message: ChatMessage & { status?: 'sending' | 'sent' | 'failed'; replyCount?: number; isPinned?: boolean };
  reactions?: Record<string, { count: number; userReacted: boolean }>;
  onReaction: (messageId: string, reactionType: string) => void;
  onReply?: (messageId: string) => void;
  showSenderInfo?: boolean;
  onRetry?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  // System message visibility preferences
  systemMessagePrefs?: {
    showSystemMessages: boolean;
    categories: SystemMessageCategoryPrefs;
  };
  tripMembers?: Array<{ id: string; name: string; avatar?: string }>;
  readStatuses?: any[];
}

export const MessageItem = memo(
  ({
    message,
    reactions,
    onReaction,
    onReply,
    showSenderInfo,
    onRetry,
    onEdit,
    onDelete,
    systemMessagePrefs,
    tripMembers,
    readStatuses,
  }: MessageItemProps) => {
    const { user } = useAuth();
    const messageWithGrounding = message as unknown as ChatMessageWithGrounding;

    const handleEdit = useCallback(
      (messageId: string, newContent: string) => {
        onEdit?.(messageId, newContent);
      },
      [onEdit],
    );

    const handleDelete = useCallback(
      (messageId: string) => {
        onDelete?.(messageId);
      },
      [onDelete],
    );

    // Check for system messages
    const isSystemMessage =
      message.tags?.includes('system') === true || (message as any).message_type === 'system';

    // Filter system messages based on preferences
    if (isSystemMessage && systemMessagePrefs) {
      const eventType = (message as any).system_event_type;
      if (
        !shouldShowSystemMessage(
          systemMessagePrefs.showSystemMessages,
          systemMessagePrefs.categories,
          eventType,
        )
      ) {
        return null; // Hide this system message
      }
    }

    // Determine if message is from current user
    const senderUserId = (message.sender as any).userId || message.sender.id;
    const isOwnMessage = user?.id
      ? senderUserId === user.id ||
        message.sender.id === user.id ||
        message.sender.name === (user.displayName || user.email?.split('@')[0])
      : false;

    const messageWithMedia = message as any;

    if (isSystemMessage) {
      return <SystemMessageBubble body={message.text} timestamp={message.createdAt} />;
    }

    return (
      <div className={message.isPinned ? "relative" : ""}>
        {message.isPinned && (
            <div className="absolute -left-3 top-0 bottom-0 w-1 bg-primary/50 rounded-full" title="Pinned Message" />
        )}
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
            replyCount={message.replyCount || 0}
            onReply={onReply}
            showSenderInfo={showSenderInfo}
            messageType="trip"
            isPinned={message.isPinned}
            onEdit={handleEdit}
            onDelete={handleDelete}
            grounding={
            messageWithGrounding.sources || messageWithGrounding.googleMapsWidget
                ? {
                    sources: messageWithGrounding.sources,
                    googleMapsWidget: messageWithGrounding.googleMapsWidget,
                }
                : undefined
            }
            mediaType={messageWithMedia.mediaType}
            mediaUrl={messageWithMedia.mediaUrl}
            linkPreview={messageWithMedia.linkPreview}
            attachments={messageWithMedia.attachments}
            status={message.status}
            onRetry={onRetry}
            tripMembers={tripMembers}
            readStatuses={readStatuses}
            currentUserId={user?.id || ''}
            // Pass the resolved replyTo context if available
            replyTo={message.replyTo}
        />
      </div>
    );
  },
);
