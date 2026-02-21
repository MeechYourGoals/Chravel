/**
 * Inbox/notification-level message types.
 *
 * NOTE: This file defines `InboxMessage` for the unified inbox and scheduled
 * messages. It is DISTINCT from `Message` in `messages.ts`, which represents
 * a trip chat message backed by the `trip_chat_messages` DB table.
 *
 * Previously, both files exported an interface named `Message` with
 * conflicting field names (high-risk audit item #31). This rename
 * eliminates the ambiguity.
 */

export interface InboxMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  tripId?: string;
  tourId?: string;
  tripName?: string;
  tourName?: string;
  timestamp: string;
  isRead: boolean;
  isBroadcast?: boolean;
  messageType?: 'chat' | 'broadcast';
  priority?: 'urgent' | 'reminder' | 'fyi';
  mentions?: string[];
  threadId?: string;
  replyToId?: string;
}

/** @deprecated Use `InboxMessage` instead. Kept for backward compatibility. */
export type Message = InboxMessage;

export interface MessageThread {
  id: string;
  tripId?: string;
  tourId?: string;
  participants: string[];
  lastMessage?: InboxMessage;
  unreadCount: number;
}

export interface UnifiedInboxData {
  messages: InboxMessage[];
  threads: MessageThread[];
  totalUnread: number;
}

export interface ScheduledMessage extends InboxMessage {
  sendAt: string;
  isSent: boolean;
}
