/**
 * Optimistic Messages Hook
 * Manages pending messages for instant UI feedback
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  OptimisticMessage,
  MessageStatus,
  RichChatAttachment,
  RichLinkPreview,
} from '@/types/chatAttachment';

const STORAGE_KEY = 'chravel_pending_messages';

interface UseOptimisticMessagesOptions {
  tripId: string;
}

export const useOptimisticMessages = ({ tripId }: UseOptimisticMessagesOptions) => {
  const [pendingMessages, setPendingMessages] = useState<OptimisticMessage[]>([]);

  // Load failed messages from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allPending: OptimisticMessage[] = JSON.parse(stored);
        const tripPending = allPending.filter(
          msg => msg.tripId === tripId && msg.status === 'failed',
        );
        setPendingMessages(tripPending);
      }
    } catch (error) {
      console.warn('[OptimisticMessages] Failed to load from storage:', error);
    }
  }, [tripId]);

  // Persist failed messages to localStorage
  const persistFailedMessages = useCallback(
    (messages: OptimisticMessage[]) => {
      try {
        const failed = messages.filter(msg => msg.status === 'failed');
        const stored = localStorage.getItem(STORAGE_KEY);
        const allPending: OptimisticMessage[] = stored ? JSON.parse(stored) : [];

        // Remove old messages for this trip and add new ones
        const otherTrips = allPending.filter(msg => msg.tripId !== tripId);
        const updated = [...otherTrips, ...failed];

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('[OptimisticMessages] Failed to persist:', error);
      }
    },
    [tripId],
  );

  // Add a new optimistic message
  const addOptimisticMessage = useCallback(
    (
      clientMessageId: string,
      content: string,
      authorName: string,
      userId: string,
      messageType: OptimisticMessage['messageType'],
      attachments?: RichChatAttachment[],
      linkPreview?: RichLinkPreview | null,
    ): OptimisticMessage => {
      const message: OptimisticMessage = {
        clientMessageId,
        tripId,
        content,
        authorName,
        userId,
        messageType,
        attachments,
        linkPreview,
        status: 'sending',
        createdAt: new Date().toISOString(),
      };

      setPendingMessages(prev => [...prev, message]);
      return message;
    },
    [tripId],
  );

  // Update message status
  const updateMessageStatus = useCallback(
    (clientMessageId: string, status: MessageStatus, error?: string) => {
      setPendingMessages(prev => {
        const updated = prev.map(msg =>
          msg.clientMessageId === clientMessageId ? { ...msg, status, error } : msg,
        );

        // Persist failed messages
        if (status === 'failed') {
          persistFailedMessages(updated);
        }

        return updated;
      });
    },
    [persistFailedMessages],
  );

  // Mark message as sent (remove from pending)
  const markAsSent = useCallback(
    (clientMessageId: string) => {
      setPendingMessages(prev => {
        const updated = prev.filter(msg => msg.clientMessageId !== clientMessageId);
        persistFailedMessages(updated);
        return updated;
      });
    },
    [persistFailedMessages],
  );

  // Remove a pending message
  const removeOptimisticMessage = useCallback(
    (clientMessageId: string) => {
      setPendingMessages(prev => {
        const updated = prev.filter(msg => msg.clientMessageId !== clientMessageId);
        persistFailedMessages(updated);
        return updated;
      });
    },
    [persistFailedMessages],
  );

  // Check if a message is pending by clientMessageId
  const isPending = useCallback(
    (clientMessageId: string): boolean => {
      return pendingMessages.some(msg => msg.clientMessageId === clientMessageId);
    },
    [pendingMessages],
  );

  // Get pending message by clientMessageId
  const getPendingMessage = useCallback(
    (clientMessageId: string): OptimisticMessage | undefined => {
      return pendingMessages.find(msg => msg.clientMessageId === clientMessageId);
    },
    [pendingMessages],
  );

  // Clear all failed messages (e.g., after retry)
  const clearFailedMessages = useCallback(() => {
    setPendingMessages(prev => {
      const updated = prev.filter(msg => msg.status !== 'failed');
      persistFailedMessages(updated);
      return updated;
    });
  }, [persistFailedMessages]);

  return {
    pendingMessages,
    addOptimisticMessage,
    updateMessageStatus,
    markAsSent,
    removeOptimisticMessage,
    isPending,
    getPendingMessage,
    clearFailedMessages,
  };
};
