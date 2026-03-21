/**
 * Chat Broadcast Service
 *
 * Uses Supabase Realtime Broadcast as a fast lane for new message delivery.
 * Broadcast bypasses the CDC (Change Data Capture) decoder pipeline, delivering
 * messages in ~20-50ms instead of ~100-300ms via Postgres Changes.
 *
 * Architecture:
 *   - After INSERT into trip_chat_messages, the sender also broadcasts the message
 *   - All clients listen on Broadcast first; Postgres Changes serves as a fallback
 *   - Deduplication by message id + client_message_id ensures no duplicates
 *
 * This is a client-side broadcast (Phase 2). Phase 3 moves the broadcast trigger
 * server-side via a DB trigger for reliability even if the sender disconnects.
 */
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** Channel name convention for trip chat broadcast */
export function broadcastChannelName(tripId: string): string {
  return `chat_broadcast:${tripId}`;
}

/**
 * Broadcast channels must be private to receive DB-triggered broadcast rows
 * inserted with `private=true` in `realtime.messages`.
 */
const BROADCAST_PRIVATE_CONFIG = {
  config: { private: true },
} as const;

function createBroadcastChannel(tripId: string): RealtimeChannel {
  return supabase.channel(broadcastChannelName(tripId), BROADCAST_PRIVATE_CONFIG);
}

/**
 * Broadcast a new message to all connected clients for a trip.
 * Called after a successful INSERT into trip_chat_messages.
 * Best-effort: failures are swallowed (Postgres Changes is the fallback).
 */
export async function broadcastNewMessage(
  tripId: string,
  message: Record<string, unknown>,
): Promise<void> {
  const channel = createBroadcastChannel(tripId);
  try {
    // No need to subscribe: supabase-js sends over HTTP when not subscribed.
    await channel.send({
      type: 'broadcast',
      event: 'new_message',
      payload: message,
    });
  } catch {
    // Best-effort: Postgres Changes will deliver the message as fallback
  } finally {
    // Always cleanup ephemeral sender channel.
    void supabase.removeChannel(channel);
  }
}

/**
 * Subscribe to broadcast messages for a trip.
 * Returns the channel so the caller can manage its lifecycle.
 *
 * @param tripId - Trip to subscribe to
 * @param onMessage - Called when a broadcast message arrives
 * @returns RealtimeChannel for cleanup
 */
export function subscribeToBroadcast(
  tripId: string,
  onMessage: (message: Record<string, unknown>) => void,
): RealtimeChannel {
  const channel = createBroadcastChannel(tripId)
    .on('broadcast', { event: 'new_message' }, ({ payload }) => {
      if (payload) {
        onMessage(payload as Record<string, unknown>);
      }
    })
    .subscribe();

  return channel;
}
