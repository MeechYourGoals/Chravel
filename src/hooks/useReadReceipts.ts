/**
 * useReadReceipts Hook
 *
 * Provides read receipt functionality for messages
 * - Mark messages as read
 * - Get read receipts for messages
 * - Track unread count
 * - Real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { MessageReadReceipt } from '@/types/messages';
import {
  markMessageAsRead,
  getMessageReadReceipts,
  getUnreadMessageCount,
  markAllAsRead,
  subscribeToReadReceipts,
} from '@/services/readReceiptsService';
import { useDemoMode } from './useDemoMode';
import { useAuth } from './useAuth';

export interface UseReadReceiptsOptions {
  messageId?: string;
  messageType: 'channel' | 'trip';
  channelId?: string;
  tripId?: string;
  autoMarkAsRead?: boolean; // Automatically mark message as read when viewed
}

export const useReadReceipts = (options: UseReadReceiptsOptions) => {
  const { messageId, messageType, channelId, tripId, autoMarkAsRead = false } = options;
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();

  const [receipts, setReceipts] = useState<MessageReadReceipt[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);

  // Generate demo user ID
  const getDemoUserId = () => {
    let demoId = sessionStorage.getItem('demo-user-id');
    if (!demoId) {
      demoId = `demo-user-${Date.now()}`;
      sessionStorage.setItem('demo-user-id', demoId);
    }
    return demoId;
  };

  const effectiveUserId = user?.id || getDemoUserId();

  /**
   * Load read receipts for a message
   */
  const loadReceipts = useCallback(async () => {
    if (!messageId) return;

    setLoading(true);
    try {
      const fetchedReceipts = await getMessageReadReceipts({ messageId, messageType }, isDemoMode);
      setReceipts(fetchedReceipts);
    } catch (error) {
      console.error('[useReadReceipts] Failed to load receipts:', error);
    } finally {
      setLoading(false);
    }
  }, [messageId, messageType, isDemoMode]);

  /**
   * Load unread count
   */
  const loadUnreadCount = useCallback(async () => {
    if (!tripId || !effectiveUserId) return;

    try {
      const count = await getUnreadMessageCount(tripId, effectiveUserId, channelId, isDemoMode);
      setUnreadCount(count);
    } catch (error) {
      console.error('[useReadReceipts] Failed to load unread count:', error);
    }
  }, [tripId, effectiveUserId, channelId, isDemoMode]);

  /**
   * Mark message as read
   */
  const markAsRead = useCallback(
    async (msgId?: string) => {
      const targetMessageId = msgId || messageId;
      if (!targetMessageId || !effectiveUserId) return false;

      setMarking(true);
      try {
        const success = await markMessageAsRead(
          {
            messageId: targetMessageId,
            userId: effectiveUserId,
            messageType,
          },
          isDemoMode,
        );

        if (success) {
          // Reload receipts to reflect the change
          if (msgId === messageId) {
            await loadReceipts();
          }
          // Update unread count
          if (tripId) {
            await loadUnreadCount();
          }
        }

        return success;
      } catch (error) {
        console.error('[useReadReceipts] Failed to mark as read:', error);
        return false;
      } finally {
        setMarking(false);
      }
    },
    [messageId, effectiveUserId, messageType, isDemoMode, loadReceipts, tripId, loadUnreadCount],
  );

  /**
   * Mark all messages in channel as read
   */
  const markAllChannelAsRead = useCallback(async () => {
    if (!channelId || !effectiveUserId) return false;

    setMarking(true);
    try {
      const success = await markAllAsRead(channelId, effectiveUserId, messageType, isDemoMode);

      if (success && tripId) {
        await loadUnreadCount();
      }

      return success;
    } catch (error) {
      console.error('[useReadReceipts] Failed to mark all as read:', error);
      return false;
    } finally {
      setMarking(false);
    }
  }, [channelId, effectiveUserId, messageType, isDemoMode, tripId, loadUnreadCount]);

  /**
   * Check if current user has read the message
   */
  const hasRead = useCallback(
    (userId?: string): boolean => {
      const targetUserId = userId || effectiveUserId;
      return receipts.some(r => r.userId === targetUserId);
    },
    [receipts, effectiveUserId],
  );

  /**
   * Get read count
   */
  const readCount = receipts.length;

  /**
   * Get list of users who have read the message
   */
  const readByUsers = receipts.map(r => r.userId);

  // Load receipts on mount
  useEffect(() => {
    if (messageId) {
      loadReceipts();
    }
  }, [loadReceipts, messageId]);

  // Load unread count on mount
  useEffect(() => {
    if (tripId) {
      loadUnreadCount();
    }
  }, [loadUnreadCount, tripId]);

  // Auto-mark as read when viewing
  useEffect(() => {
    if (autoMarkAsRead && messageId && effectiveUserId) {
      const timer = setTimeout(() => {
        markAsRead();
      }, 1000); // Mark as read after viewing for 1 second

      return () => clearTimeout(timer);
    }
  }, [autoMarkAsRead, messageId, effectiveUserId, markAsRead]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!messageId || isDemoMode) return;

    const unsubscribe = subscribeToReadReceipts(messageId, messageType, updatedReceipts => {
      setReceipts(updatedReceipts);
    });

    return unsubscribe;
  }, [messageId, messageType, isDemoMode]);

  return {
    receipts,
    readCount,
    readByUsers,
    unreadCount,
    loading,
    marking,
    hasRead,
    markAsRead,
    markAllChannelAsRead,
    refresh: loadReceipts,
    refreshUnreadCount: loadUnreadCount,
  };
};
