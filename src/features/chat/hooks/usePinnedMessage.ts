/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPinnedMessages } from '@/services/chatService';

export const usePinnedMessage = (tripId: string) => {
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPinned = async () => {
    try {
      const messages = await getPinnedMessages(tripId);
      setPinnedMessages(messages);
    } catch (error) {
      console.error('[usePinnedMessage] Failed to fetch pinned messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPinned();

    // Subscribe to changes in chat messages (to update pins in real-time)
    const channel = supabase
      .channel(`pinned_messages_hook:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'trip_chat_messages',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          // Simplest strategy: Refetch on any change to chat messages in this trip
          // Optimization: Check if payload actually changed pinned status, but refetch is safe for now
          fetchPinned();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return {
    pinnedMessages,
    loading,
    refetch: fetchPinned,
  };
};
