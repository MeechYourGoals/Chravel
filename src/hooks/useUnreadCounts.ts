import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Message } from '@/services/unifiedMessagingService';

interface UseUnreadCountsOptions {
  tripId: string;
  messages: Message[];
  userId: string | null;
  enabled?: boolean;
}

interface UnreadCounts {
  unreadCount: number;
  broadcastCount: number;
}

/**
 * Hook to track unread message counts with real-time updates
 * Counts total unread messages and unread broadcasts separately
 */
export function useUnreadCounts({
  tripId,
  messages,
  userId,
  enabled = true
}: UseUnreadCountsOptions): UnreadCounts {
  const [unreadCount, setUnreadCount] = useState(0);
  const [broadcastCount, setBroadcastCount] = useState(0);

  useEffect(() => {
    if (!enabled || !userId || !tripId || messages.length === 0) {
      setUnreadCount(0);
      setBroadcastCount(0);
      return;
    }

    const calculateUnreadCounts = async () => {
      try {
        // Get all message IDs
        const messageIds = messages.map(m => m.id);

        // Query read status for current user
        const { data: readStatuses, error } = await supabase
          .from('message_read_status' as any)
          .select('message_id')
          .eq('user_id', userId)
          .eq('trip_id', tripId)
          .in('message_id', messageIds);

        if (error) {
          console.error('Failed to fetch read statuses:', error);
          return;
        }

        // Create set of read message IDs for fast lookup
        const readMessageIds = new Set(
          ((readStatuses as any[]) || []).map((status: any) => status.message_id)
        );

        // Calculate unread messages (exclude user's own messages)
        const unreadMessages = messages.filter(msg => 
          !readMessageIds.has(msg.id) && msg.user_id !== userId
        );

        // Count total unread
        const totalUnread = unreadMessages.length;

        // Count unread broadcasts
        const unreadBroadcasts = unreadMessages.filter(
          msg => msg.privacy_mode === 'broadcast'
        ).length;

        setUnreadCount(totalUnread);
        setBroadcastCount(unreadBroadcasts);

      } catch (error) {
        console.error('Error calculating unread counts:', error);
      }
    };

    calculateUnreadCounts();

    // Subscribe to read status changes
    const channel = supabase
      .channel(`unread_counts:${tripId}:${userId}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'message_read_status',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // Recalculate when read status changes
          calculateUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, userId, messages, enabled]);

  return { unreadCount, broadcastCount };
}
