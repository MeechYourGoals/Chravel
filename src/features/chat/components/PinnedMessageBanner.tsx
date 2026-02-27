import React, { useState, useEffect } from 'react';
import { Pin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPinnedMessages } from '@/services/chatService';
import { PinnedMessagesList } from './PinnedMessagesList';
import { supabase } from '@/integrations/supabase/client';

interface PinnedMessageBannerProps {
  tripId: string;
}

export const PinnedMessageBanner: React.FC<PinnedMessageBannerProps> = ({ tripId }) => {
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [isListOpen, setIsListOpen] = useState(false);

  useEffect(() => {
    const fetchPinned = async () => {
      const messages = await getPinnedMessages(tripId);
      setPinnedMessages(messages);
    };

    fetchPinned();

    // Subscribe to changes in chat messages (to update pins in real-time)
    // We filter locally for now since we can't easily filter by JSONB change in realtime
    const channel = supabase
      .channel(`pinned_messages:${tripId}`)
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  if (pinnedMessages.length === 0) return null;

  const latestPin = pinnedMessages[0];

  return (
    <>
      <div
        className="bg-accent/20 border-b border-accent/20 px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-accent/30 transition-colors backdrop-blur-sm sticky top-0 z-10"
        onClick={() => setIsListOpen(true)}
      >
        <Pin className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-primary mb-0.5">Pinned Message</p>
          <p className="text-sm text-foreground/90 truncate">{latestPin.content}</p>
        </div>
        {pinnedMessages.length > 1 && (
          <span className="text-xs text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full">
            +{pinnedMessages.length - 1}
          </span>
        )}
      </div>

      <PinnedMessagesList
        isOpen={isListOpen}
        onClose={() => setIsListOpen(false)}
        messages={pinnedMessages}
        onUnpin={() => {
            // Optimistic update or just trigger refetch via subscription
        }}
      />
    </>
  );
};
