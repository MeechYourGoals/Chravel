import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Minimal message shape for unread counting - compatible with useTripChat and useUnifiedMessages */
interface UnreadMessage {
  id: string;
  user_id?: string;
  privacy_mode?: string;
  message_type?: string;
}

interface UseUnreadCountsOptions {
  tripId: string;
  messages: UnreadMessage[];
  userId: string | null;
  enabled?: boolean;
}

interface UnreadCounts {
  broadcastCount: number;
  messageUnreadCount: number;
}

/**
 * Hook to track unread message counts with real-time updates.
 * Debounces recalculation to avoid firing multiple times per second when
 * rapid read receipt events arrive (e.g. user scrolling through many messages).
 */
export function useUnreadCounts({
  tripId,
  messages,
  userId,
  enabled = true,
}: UseUnreadCountsOptions): UnreadCounts {
  const [broadcastCount, setBroadcastCount] = useState(0);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stabilize message IDs to avoid re-render loops from new array references.
  // Only recalculates when the actual set of message IDs changes.
  const messageIdList = useMemo(() => messages.map(m => m.id).join(','), [messages]);
  const stableMessages = useMemo(() => messages, [messageIdList]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculateUnreadCounts = useCallback(async () => {
    if (!userId || !tripId || stableMessages.length === 0) {
      setBroadcastCount(0);
      setMessageUnreadCount(0);
      return;
    }

    try {
      const messageIds = stableMessages.map(m => m.id);

      const { data: readStatuses, error } = await supabase
        .from('message_read_receipts')
        .select('message_id')
        .eq('user_id', userId)
        .in('message_id', messageIds);

      if (error) {
        if (import.meta.env.DEV) console.error('Failed to fetch read statuses:', error);
        return;
      }

      const readMessageIds = new Set(
        (readStatuses ?? []).map((s: { message_id: string }) => s.message_id),
      );

      const unreadMessages = stableMessages.filter(
        msg => !readMessageIds.has(msg.id) && msg.user_id !== userId,
      );
      const totalUnread = unreadMessages.length;
      const unreadBroadcasts = unreadMessages.filter(
        msg => msg.privacy_mode === 'broadcast' || msg.message_type === 'broadcast',
      ).length;

      setBroadcastCount(unreadBroadcasts);
      setMessageUnreadCount(totalUnread - unreadBroadcasts);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error calculating unread counts:', error);
    }
  }, [tripId, userId, stableMessages]);

  // Debounced version for realtime events
  const debouncedCalculate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      calculateUnreadCounts();
    }, 500);
  }, [calculateUnreadCounts]);

  useEffect(() => {
    if (!enabled || !userId || !tripId || stableMessages.length === 0) {
      setBroadcastCount(0);
      setMessageUnreadCount(0);
      return;
    }

    // Calculate immediately on mount / dependency change
    calculateUnreadCounts();

    // Subscribe to read status changes — debounced to avoid recalc storm
    const channel = supabase
      .channel(`unread_counts:${tripId}:${userId}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'message_read_receipts',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          debouncedCalculate();
        },
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [tripId, userId, stableMessages, enabled, calculateUnreadCounts, debouncedCalculate]);

  return { broadcastCount, messageUnreadCount };
}
