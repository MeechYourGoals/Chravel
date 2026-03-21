/**
 * Trip Realtime Multiplexer
 *
 * Consolidates multiple Postgres Changes subscriptions for a single trip
 * into one Supabase Realtime channel to reduce connection overhead.
 *
 * Instead of creating separate channels for:
 *   - trip_chat_{tripId} (chat messages INSERT/UPDATE)
 *   - reactions-{tripId} (message_reactions *)
 *   - read_receipts:{tripId} (message_read_receipts INSERT)
 *   - unread_counts:{tripId}:{userId} (message_read_receipts *)
 *
 * This multiplexer creates a single channel with all handlers attached,
 * reducing WebSocket overhead from 4 channels to 1.
 *
 * Phase: Messaging Architecture Review — Phase 3c
 */
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type PostgresPayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

export interface TripChannelHandlers {
  onChatInsert?: (payload: PostgresPayload) => void;
  onChatUpdate?: (payload: PostgresPayload) => void;
  onReaction?: (payload: PostgresPayload) => void;
  onReadReceipt?: (payload: PostgresPayload) => void;
}

/**
 * Create a single multiplexed Supabase Realtime channel for all Postgres Changes
 * subscriptions related to trip chat (messages, reactions, read receipts).
 *
 * Callers attach handlers via the `handlers` object. The returned channel must
 * be cleaned up via `supabase.removeChannel(channel)` on unmount.
 */
export function createTripChatChannel(
  tripId: string,
  handlers: TripChannelHandlers,
): RealtimeChannel {
  const channel = supabase.channel(`trip_chat_mux:${tripId}`);

  if (handlers.onChatInsert) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_chat_messages',
        filter: `trip_id=eq.${tripId}`,
      },
      handlers.onChatInsert,
    );
  }

  if (handlers.onChatUpdate) {
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'trip_chat_messages',
        filter: `trip_id=eq.${tripId}`,
      },
      handlers.onChatUpdate,
    );
  }

  if (handlers.onReaction) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
        filter: `trip_id=eq.${tripId}`,
      },
      handlers.onReaction,
    );
  }

  if (handlers.onReadReceipt) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message_read_receipts',
        filter: `trip_id=eq.${tripId}`,
      },
      handlers.onReadReceipt,
    );
  }

  return channel;
}
