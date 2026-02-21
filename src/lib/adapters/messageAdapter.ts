/**
 * Message adapter: converts between Supabase DB rows and app-level types.
 *
 * DB table: trip_chat_messages (user_id for sender, author_name)
 * App types: Message (sender_id), UnifiedMessage (senderId)
 *
 * Key mismatches resolved:
 * - DB user_id -> App Message.sender_id / UnifiedMessage.senderId
 * - DB author_name -> App UnifiedMessage.senderName
 * - DB created_at -> App UnifiedMessage.timestamp
 */

import type { Database } from '../../integrations/supabase/types';
import type { Message, UnifiedMessage } from '../../types/messages';
import { normalizeMessageType } from '../../constants/messageTypes';

type ChatMessageRow = Database['public']['Tables']['trip_chat_messages']['Row'];

/**
 * Converts a Supabase trip_chat_messages row to an app-level Message.
 *
 * The Message interface uses `sender_id` (snake_case) while DB uses `user_id`.
 */
export function toAppMessage(row: ChatMessageRow): Message {
  return {
    id: row.id,
    content: row.content,
    sender_id: row.user_id ?? '',
    trip_id: row.trip_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author_name: row.author_name,
    user_id: row.user_id ?? undefined,
    reply_to_id: row.reply_to_id ?? undefined,
    thread_id: row.thread_id ?? undefined,
    is_edited: row.is_edited ?? undefined,
    edited_at: row.edited_at ?? undefined,
    is_deleted: row.is_deleted ?? undefined,
    deleted_at: row.deleted_at ?? undefined,
    attachments: row.attachments as Message['attachments'],
    media_type: row.media_type ?? undefined,
    media_url: row.media_url ?? undefined,
    link_preview: row.link_preview as Message['link_preview'],
    privacy_mode: row.privacy_mode ?? undefined,
    privacy_encrypted: row.privacy_encrypted ?? undefined,
  };
}

/**
 * Converts a Supabase trip_chat_messages row to a UnifiedMessage.
 *
 * UnifiedMessage uses full camelCase naming and includes type classification.
 * Requires profile data (avatar) to be passed as an override since it's not in the messages table.
 */
export function toUnifiedMessage(
  row: ChatMessageRow,
  overrides?: { senderAvatar?: string },
): UnifiedMessage {
  return {
    id: row.id,
    tripId: row.trip_id,
    content: row.content,
    senderId: row.user_id ?? '',
    senderName: row.author_name,
    senderAvatar: overrides?.senderAvatar,
    timestamp: row.created_at,
    edited: row.is_edited ?? false,
    editedAt: row.edited_at ?? undefined,
    deleted: row.is_deleted ?? false,
    deletedAt: row.deleted_at ?? undefined,
    type: normalizeMessageType(row.message_type),
    attachments: row.attachments as UnifiedMessage['attachments'],
    replyTo: row.reply_to_id
      ? { messageId: row.reply_to_id, content: '', senderName: '' }
      : undefined,
    metadata: row.payload as UnifiedMessage['metadata'],
  };
}

/**
 * Converts app-level message data to a DB-compatible insert payload.
 */
export function toDbMessageInsert(
  tripId: string,
  userId: string,
  authorName: string,
  data: {
    content: string;
    replyToId?: string;
    threadId?: string;
    messageType?: string;
    mediaType?: string;
    mediaUrl?: string;
    privacyMode?: string;
  },
): Database['public']['Tables']['trip_chat_messages']['Insert'] {
  return {
    trip_id: tripId,
    user_id: userId,
    author_name: authorName,
    content: data.content,
    reply_to_id: data.replyToId ?? null,
    thread_id: data.threadId ?? null,
    message_type: data.messageType ?? 'text',
    media_type: data.mediaType ?? null,
    media_url: data.mediaUrl ?? null,
    privacy_mode: data.privacyMode ?? null,
  };
}
