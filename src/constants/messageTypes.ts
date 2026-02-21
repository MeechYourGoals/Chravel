/**
 * Canonical message types for trip chat messages.
 *
 * These correspond to the message_type column in trip_chat_messages
 * and the `type` field on UnifiedMessage.
 */

export const MESSAGE_TYPES = ['text', 'broadcast', 'payment', 'system'] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

/**
 * Returns the canonical MessageType, defaulting to 'text' for null/unknown.
 */
export function normalizeMessageType(raw: string | null | undefined): MessageType {
  if (!raw) return 'text';
  if ((MESSAGE_TYPES as readonly string[]).includes(raw)) return raw as MessageType;
  return 'text';
}
