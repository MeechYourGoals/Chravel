import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { connectionMonitor } from '@/utils/concurrencyUtils';

interface RealtimeOptions {
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  batchUpdates?: boolean;
  batchDelay?: number;
}

// Enhanced realtime hook with connection management and batching
export const useRealtimeOptimizations = (
  tableName: string,
  filter: Record<string, any>,
  onUpdate: (payload: any) => void,
  options: RealtimeOptions = {},
) => {
  const {
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,
    batchUpdates = true,
    batchDelay = 100,
  } = options;

  const channelRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef(0);
  const batchTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingUpdatesRef = useRef<any[]>([]);
  const isConnectedRef = useRef(false);

  const processBatch = useCallback(() => {
    if (pendingUpdatesRef.current.length > 0) {
      const updates = [...pendingUpdatesRef.current];
      pendingUpdatesRef.current = [];

      // Process all updates at once
      updates.forEach(update => onUpdate(update));
    }
  }, [onUpdate]);

  const handleUpdate = useCallback(
    (payload: any) => {
      if (batchUpdates) {
        pendingUpdatesRef.current.push(payload);

        if (batchTimeoutRef.current) {
          clearTimeout(batchTimeoutRef.current);
        }

        batchTimeoutRef.current = setTimeout(processBatch, batchDelay);
      } else {
        onUpdate(payload);
      }
    },
    [onUpdate, batchUpdates, batchDelay, processBatch],
  );

  const connect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelName = `${tableName}_${Object.values(filter).join('_')}`;
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: Object.entries(filter)
            .map(([key, value]) => `${key}=eq.${value}`)
            .join(','),
        },
        handleUpdate,
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          isConnectedRef.current = true;
          reconnectAttemptsRef.current = 0;
        } else if (status === 'CHANNEL_ERROR') {
          isConnectedRef.current = false;
          console.error(`❌ Error subscribing to ${tableName} changes`);

          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            setTimeout(
              () => {
                if (connectionMonitor.getStatus()) {
                  connect();
                }
              },
              reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1),
            );
          }
        }
      });
  }, [tableName, filter, handleUpdate, maxReconnectAttempts, reconnectDelay]);

  const disconnect = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      processBatch(); // Process any pending updates before disconnecting
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isConnectedRef.current = false;
    }
  }, [processBatch]);

  // Initial connection
  useEffect(() => {
    if (connectionMonitor.getStatus()) {
      connect();
    }

    // Listen for online/offline events
    const unsubscribe = connectionMonitor.subscribe(online => {
      if (online && !isConnectedRef.current) {
        connect();
      } else if (!online) {
        disconnect();
      }
    });

    return () => {
      unsubscribe();
      disconnect();
    };
  }, [connect, disconnect]);

  // Clean up on unmount
  useEffect(() => {
    return disconnect;
  }, [disconnect]);

  return {
    isConnected: isConnectedRef.current,
    reconnectAttempts: reconnectAttemptsRef.current,
    reconnect: connect,
  };
};

// Message ordering utility for real-time updates
export class MessageOrderingQueue {
  private expectedSequence: number = 0;
  private buffer: Map<number, any> = new Map();
  private onOrderedMessage: (message: any) => void;

  constructor(onOrderedMessage: (message: any) => void) {
    this.onOrderedMessage = onOrderedMessage;
  }

  addMessage(message: any, sequence: number) {
    if (sequence === this.expectedSequence) {
      // Process this message and any buffered ones that follow
      this.onOrderedMessage(message);
      this.expectedSequence++;

      // Check buffer for next expected messages
      while (this.buffer.has(this.expectedSequence)) {
        const nextMessage = this.buffer.get(this.expectedSequence)!;
        this.buffer.delete(this.expectedSequence);
        this.onOrderedMessage(nextMessage);
        this.expectedSequence++;
      }
    } else if (sequence > this.expectedSequence) {
      // Buffer future messages
      this.buffer.set(sequence, message);
    }
    // Ignore messages with sequence < expectedSequence (duplicates or old messages)
  }

  reset() {
    this.expectedSequence = 0;
    this.buffer.clear();
  }
}

// Real-time presence tracker
export const usePresenceTracking = (tripId: string, userId: string) => {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!tripId || !userId) return;

    const channel = supabase.channel(`trip_presence_${tripId}`);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {})
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {})
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            trip_id: tripId,
          });
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [tripId, userId]);

  return channelRef.current;
};
