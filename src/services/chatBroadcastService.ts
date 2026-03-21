/**
 * Chat Broadcast Service
 *
 * Subscribes to Supabase Realtime Broadcast for fast message delivery.
 * The server-side DB trigger (broadcast_chat_message) writes to
 * `realtime.messages`, which Supabase delivers via the broadcast channel.
 * This bypasses the CDC pipeline, delivering in ~20-50ms vs ~100-300ms.
 *
 * Architecture:
 *   - DB trigger broadcasts on INSERT into trip_chat_messages (server-side)
 *   - Clients subscribe to the private broadcast channel for fast delivery
 *   - Postgres Changes subscription serves as a fallback/consistency check
 *   - Deduplication by message id + client_message_id ensures no duplicates
 *
 * Security:
 *   - Channels use `private: true` — requires authenticated Supabase session
 *   - Payloads are validated before being accepted into UI state
 *   - Only the server-side trigger can publish (no client-side broadcast)
 */
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** Channel name convention for trip chat broadcast */
export function broadcastChannelName(tripId: string): string {
  return `chat_broadcast:${tripId}`;
}

/**
 * Validate that a broadcast payload contains the required fields for a chat message.
 * Rejects payloads that are missing critical fields or have a mismatched trip_id.
 */
function isValidBroadcastPayload(
  payload: Record<string, unknown>,
  expectedTripId: string,
): boolean {
  // Required fields that every legitimate message must have
  if (typeof payload.id !== 'string' || !payload.id) return false;
  if (typeof payload.trip_id !== 'string' || payload.trip_id !== expectedTripId) return false;
  if (typeof payload.content !== 'string') return false;
  if (typeof payload.user_id !== 'string' || !payload.user_id) return false;
  if (typeof payload.created_at !== 'string' || !payload.created_at) return false;
  return true;
}

/**
 * Subscribe to broadcast messages for a trip.
 * Uses private channels (requires authenticated Supabase session).
 * Validates payloads before passing to the callback.
 *
 * @param tripId - Trip to subscribe to
 * @param onMessage - Called when a validated broadcast message arrives
 * @returns RealtimeChannel for cleanup
 */
export function subscribeToBroadcast(
  tripId: string,
  onMessage: (message: Record<string, unknown>) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(broadcastChannelName(tripId), { config: { private: true } })
    .on('broadcast', { event: 'new_message' }, ({ payload }) => {
      if (payload && isValidBroadcastPayload(payload as Record<string, unknown>, tripId)) {
        onMessage(payload as Record<string, unknown>);
      }
    })
    .subscribe();

  return channel;
}
