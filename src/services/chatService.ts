import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { retryWithBackoff } from '@/utils/retry';
import type { RichChatAttachment, RichLinkPreview } from '@/types/chatAttachment';
import { notifyTripOfChatMessage } from './pushNotificationTrigger';
import { privacyService } from './privacyService';
import type { PrivacyMode } from '@/types/privacy';
type Row = Database['public']['Tables']['trip_chat_messages']['Row'];
type Insert = Database['public']['Tables']['trip_chat_messages']['Insert'];

export type AttachmentType = 'image' | 'video' | 'file' | 'link';
export type RichMessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'file'
  | 'link'
  | 'broadcast'
  | 'payment'
  | 'system';

export interface ChatMessageInsert extends Omit<Insert, 'attachments'> {
  attachments?: {
    type: AttachmentType;
    ref_id: string;
    url?: string;
  }[];
  message_type?: 'text' | 'broadcast' | 'payment' | 'system';
  client_message_id?: string;
  reply_to_id?: string;
}

/** Enhanced insert with rich media support */
export interface RichChatMessageInsert {
  trip_id: string;
  content: string;
  author_name: string;
  user_id?: string;
  client_message_id?: string;
  message_type?: RichMessageType;
  media_type?: string;
  media_url?: string;
  attachments?: RichChatAttachment[];
  link_preview?: RichLinkPreview | null;
  privacy_mode?: string;
}

/**
 * Generate a client-side message ID for idempotency
 */
function generateClientMessageId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const random = Math.random().toString(16).slice(2).padEnd(12, '0').slice(0, 12);
  return `00000000-0000-4000-8000-${random}`;
}

export async function sendChatMessage(msg: ChatMessageInsert) {
  // Always generate a client_message_id for idempotency if not provided
  const clientMessageId = msg.client_message_id || generateClientMessageId();

  return retryWithBackoff(
    async () => {
      let contentToSend = msg.content;
      let isEncrypted = false;
      const privacyMode = (msg.privacy_mode as PrivacyMode) || 'standard';

      // Encrypt message content if High Privacy mode
      if (privacyMode === 'high' && msg.content) {
        try {
          const result = await privacyService.prepareMessageForSending(
            msg.content,
            msg.trip_id,
            privacyMode,
          );
          contentToSend = result.content;
          isEncrypted = result.encrypted;

          if (import.meta.env.DEV) {
            console.log('[chatService] Message encrypted for High Privacy mode');
          }
        } catch (encryptError) {
          console.error('[chatService] Encryption failed for High Privacy mode:', encryptError);
          throw new Error('Failed to encrypt your message in High Privacy mode. Please try again.');
        }
      }

      const insertPayload = {
        ...msg,
        content: contentToSend,
        client_message_id: clientMessageId,
        privacy_mode: privacyMode,
        privacy_encrypted: isEncrypted,
        message_type: msg.message_type || 'text',
        attachments: msg.attachments as any,
      };

      if (import.meta.env.DEV) {
        console.log('[chatService] Sending message:', {
          clientMessageId,
          tripId: msg.trip_id,
          contentPreview: msg.content?.substring(0, 50),
        });
      }

      const { data, error } = await supabase
        .from('trip_chat_messages')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation (duplicate client_message_id)
        if (error.code === '23505' && error.message.includes('client_message_id')) {
          console.warn(
            '[chatService] Duplicate message detected, fetching existing:',
            clientMessageId,
          );
          // Fetch the existing message instead of failing
          const { data: existing } = await supabase
            .from('trip_chat_messages')
            .select()
            .eq('trip_id', msg.trip_id)
            .eq('client_message_id', clientMessageId)
            .single();
          if (existing) return existing;
        }
        throw error;
      }

      if (import.meta.env.DEV) {
        console.log('[chatService] Message sent successfully:', {
          messageId: data.id,
          clientMessageId,
        });
      }

      // Fire and forget - don't block message return
      if (data && msg.user_id && msg.message_type !== 'system') {
        notifyTripOfChatMessage({
          tripId: data.trip_id,
          senderId: msg.user_id,
          senderName: data.author_name,
          messageContent: data.content,
          messageId: data.id,
        });
      }

      return data;
    },
    {
      maxRetries: 3,
      onRetry: (attempt, error) => {
        if (import.meta.env.DEV) {
          console.warn(
            `[chatService] Retry attempt ${attempt}/3 for sending chat message:`,
            error.message,
          );
        }
      },
    },
  );
}

/**
 * Send a rich media chat message with client_message_id for deduplication
 */
export async function sendRichChatMessage(msg: RichChatMessageInsert) {
  return retryWithBackoff(
    async () => {
      let contentToSend = msg.content;
      let isEncrypted = false;
      const privacyMode = (msg.privacy_mode as PrivacyMode) || 'standard';

      // Encrypt message content if High Privacy mode
      if (privacyMode === 'high' && msg.content) {
        try {
          const result = await privacyService.prepareMessageForSending(
            msg.content,
            msg.trip_id,
            privacyMode,
          );
          contentToSend = result.content;
          isEncrypted = result.encrypted;
        } catch (encryptError) {
          console.error(
            '[chatService] Rich message encryption failed for High Privacy mode:',
            encryptError,
          );
          throw new Error('Failed to encrypt your message in High Privacy mode. Please try again.');
        }
      }

      const insertPayload: any = {
        trip_id: msg.trip_id,
        content: contentToSend,
        author_name: msg.author_name,
        user_id: msg.user_id,
        privacy_mode: privacyMode,
        privacy_encrypted: isEncrypted,
        message_type: msg.message_type || 'text',
      };

      // Add optional fields only if present
      if (msg.client_message_id) {
        insertPayload.client_message_id = msg.client_message_id;
      }
      if (msg.media_type) {
        insertPayload.media_type = msg.media_type;
      }
      if (msg.media_url) {
        insertPayload.media_url = msg.media_url;
      }
      if (msg.attachments && msg.attachments.length > 0) {
        insertPayload.attachments = msg.attachments;
      }
      if (msg.link_preview) {
        insertPayload.link_preview = msg.link_preview;
      }

      const { data, error } = await supabase
        .from('trip_chat_messages')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation (duplicate client_message_id)
        if (error.code === '23505' && error.message.includes('client_message_id')) {
          console.warn(
            '[chatService] Duplicate message detected, fetching existing:',
            msg.client_message_id,
          );
          // Fetch the existing message instead
          const { data: existing } = await supabase
            .from('trip_chat_messages')
            .select()
            .eq('trip_id', msg.trip_id)
            .eq('client_message_id', msg.client_message_id)
            .single();
          if (existing) return existing;
        }
        throw error;
      }

      // TODO: Trigger push notification after successful message creation
      // Fire and forget - don't block message return
      if (data && msg.user_id && msg.message_type !== 'system') {
        notifyTripOfChatMessage({
          tripId: data.trip_id,
          senderId: msg.user_id,
          senderName: data.author_name,
          messageContent: data.content,
          messageId: data.id,
        });
      }

      return data;
    },
    {
      maxRetries: 3,
      onRetry: (attempt, error) => {
        if (import.meta.env.DEV) {
          console.warn(`Retry attempt ${attempt}/3 for sending rich chat message:`, error.message);
        }
      },
    },
  );
}

export function subscribeToChatMessages(tripId: string, onInsert: (row: Row) => void) {
  return supabase
    .channel(`chat:${tripId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_chat_messages',
        filter: `trip_id=eq.${tripId}`,
      },
      payload => onInsert(payload.new as Row),
    )
    .subscribe();
}

/**
 * Edit a chat message
 */
export async function editChatMessage(messageId: string, newContent: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trip_chat_messages')
      .update({
        content: newContent,
        edited_at: new Date().toISOString(),
        is_edited: true,
      })
      .eq('id', messageId);

    if (error) {
      console.error('[chatService] Edit message error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[chatService] Unexpected error editing message:', error);
    return false;
  }
}

/**
 * Edit a channel message
 */
export async function editChannelMessage(messageId: string, newContent: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('channel_messages')
      .update({
        content: newContent,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) {
      console.error('[chatService] Edit channel message error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[chatService] Unexpected error editing channel message:', error);
    return false;
  }
}

/**
 * Soft delete a chat message
 */
export async function deleteChatMessage(messageId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trip_chat_messages')
      .update({
        deleted_at: new Date().toISOString(),
        is_deleted: true,
      })
      .eq('id', messageId);

    if (error) {
      console.error('[chatService] Delete message error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[chatService] Unexpected error deleting message:', error);
    return false;
  }
}

/**
 * Soft delete a channel message
 */
export async function deleteChannelMessage(messageId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('channel_messages')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) {
      console.error('[chatService] Delete channel message error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[chatService] Unexpected error deleting channel message:', error);
    return false;
  }
}

export function subscribeToMediaUpdates(
  tripId: string,
  handlers: {
    onMediaInsert?: (row: Database['public']['Tables']['trip_media_index']['Row']) => void;
    onFileInsert?: (row: Database['public']['Tables']['trip_files']['Row']) => void;
    onLinkInsert?: (row: Database['public']['Tables']['trip_link_index']['Row']) => void;
  },
) {
  const channel = supabase.channel(`media:${tripId}`);

  if (handlers.onMediaInsert) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_media_index',
        filter: `trip_id=eq.${tripId}`,
      },
      payload => handlers.onMediaInsert!(payload.new as any),
    );
  }

  if (handlers.onFileInsert) {
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'trip_files', filter: `trip_id=eq.${tripId}` },
      payload => handlers.onFileInsert!(payload.new as any),
    );
  }

  if (handlers.onLinkInsert) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_link_index',
        filter: `trip_id=eq.${tripId}`,
      },
      payload => handlers.onLinkInsert!(payload.new as any),
    );
  }

  return channel.subscribe();
}

// ============================================================================
// MESSAGE REACTIONS
// ============================================================================

export type ReactionType = 'like' | 'love' | 'dislike' | 'important';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface ReactionCount {
  type: ReactionType;
  count: number;
  userReacted: boolean;
  userIds: string[];
}

/**
 * Add a reaction to a message (toggle - adds if not present, removes if present)
 */
export async function toggleMessageReaction(
  messageId: string,
  userId: string,
  reactionType: ReactionType,
): Promise<{ added: boolean; error?: string }> {
  try {
    // Use direct query with type assertion since message_reactions isn't in generated types
    const { data: existingRows } = await (supabase as any)
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('reaction_type', reactionType)
      .limit(1);

    const existing = existingRows?.[0] as { id: string } | undefined;

    if (existing) {
      // Remove existing reaction
      await (supabase as any).from('message_reactions').delete().eq('id', existing.id);

      return { added: false };
    } else {
      // Add new reaction
      await (supabase as any).from('message_reactions').insert({
        message_id: messageId,
        user_id: userId,
        reaction_type: reactionType,
      });

      return { added: true };
    }
  } catch (error) {
    console.error('[chatService] Toggle reaction error:', error);
    return { added: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all reactions for a message
 */
export async function getMessageReactions(messageId: string): Promise<ReactionCount[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('message_reactions')
      .select('reaction_type, user_id')
      .eq('message_id', messageId);

    if (error) throw error;

    // Aggregate reactions by type
    const reactionMap = new Map<ReactionType, string[]>();
    for (const row of (data || []) as { reaction_type: string; user_id: string }[]) {
      const type = row.reaction_type as ReactionType;
      if (!reactionMap.has(type)) {
        reactionMap.set(type, []);
      }
      reactionMap.get(type)!.push(row.user_id);
    }

    return Array.from(reactionMap.entries()).map(([type, userIds]) => ({
      type,
      count: userIds.length,
      userReacted: false, // Will be set by caller with current user ID
      userIds,
    }));
  } catch (error) {
    console.error('[chatService] Get reactions error:', error);
    return [];
  }
}

/**
 * Get reactions for multiple messages (batched for performance)
 */
export async function getMessagesReactions(
  messageIds: string[],
  currentUserId?: string,
): Promise<Record<string, Record<ReactionType, ReactionCount>>> {
  if (messageIds.length === 0) return {};

  try {
    const { data, error } = await (supabase as any)
      .from('message_reactions')
      .select('message_id, reaction_type, user_id')
      .in('message_id', messageIds);

    if (error) throw error;

    // Build reaction counts per message
    const result: Record<string, Record<ReactionType, ReactionCount>> = {};

    for (const row of (data || []) as {
      message_id: string;
      reaction_type: string;
      user_id: string;
    }[]) {
      const msgId = row.message_id;
      const type = row.reaction_type as ReactionType;

      if (!result[msgId]) {
        result[msgId] = {} as Record<ReactionType, ReactionCount>;
      }

      if (!result[msgId][type]) {
        result[msgId][type] = {
          type,
          count: 0,
          userReacted: false,
          userIds: [],
        };
      }

      result[msgId][type].count++;
      result[msgId][type].userIds.push(row.user_id);
      if (currentUserId && row.user_id === currentUserId) {
        result[msgId][type].userReacted = true;
      }
    }

    return result;
  } catch (error) {
    console.error('[chatService] Get batch reactions error:', error);
    return {};
  }
}

/**
 * Subscribe to reaction changes for messages in a trip
 */
export function subscribeToReactions(
  tripId: string,
  onReactionChange: (payload: {
    eventType: 'INSERT' | 'DELETE';
    messageId: string;
    userId: string;
    reactionType: ReactionType;
  }) => void,
) {
  // We need to join through messages to filter by trip_id
  // Since we can't filter reactions by trip directly, we subscribe to all and filter client-side
  // A better approach would be to add trip_id to message_reactions table
  return supabase
    .channel(`reactions:${tripId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'message_reactions' },
      payload => {
        const row = payload.new as MessageReaction;
        onReactionChange({
          eventType: 'INSERT',
          messageId: row.message_id,
          userId: row.user_id,
          reactionType: row.reaction_type as ReactionType,
        });
      },
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'message_reactions' },
      payload => {
        const row = payload.old as MessageReaction;
        onReactionChange({
          eventType: 'DELETE',
          messageId: row.message_id,
          userId: row.user_id,
          reactionType: row.reaction_type as ReactionType,
        });
      },
    )
    .subscribe();
}

// ============================================================================
// THREAD REPLIES
// ============================================================================

/**
 * Send a reply to a message (thread)
 */
export async function sendThreadReply(
  tripId: string,
  parentMessageId: string,
  content: string,
  authorName: string,
  userId?: string,
): Promise<Row | null> {
  try {
    const result = await sendChatMessage({
      trip_id: tripId,
      content,
      author_name: authorName,
      user_id: userId,
      reply_to_id: parentMessageId,
    });
    return result;
  } catch (error) {
    console.error('[chatService] Send thread reply error:', error);
    return null;
  }
}

/**
 * Get thread replies for a message
 */
export async function getThreadReplies(parentMessageId: string): Promise<Row[]> {
  try {
    const { data, error } = await supabase
      .from('trip_chat_messages')
      .select('*')
      .eq('reply_to_id', parentMessageId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[chatService] Get thread replies error:', error);
    return [];
  }
}

/**
 * Subscribe to thread replies for a specific message
 */
export function subscribeToThreadReplies(
  parentMessageId: string,
  onReply: (row: Row) => void,
  onUpdate?: (row: Row) => void,
) {
  return supabase
    .channel(`thread:${parentMessageId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_chat_messages',
        filter: `reply_to_id=eq.${parentMessageId}`,
      },
      payload => onReply(payload.new as Row),
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'trip_chat_messages',
        filter: `reply_to_id=eq.${parentMessageId}`,
      },
      payload => onUpdate?.(payload.new as Row),
    )
    .subscribe();
}

/**
 * Pin a chat message. Only one message can be pinned per trip at a time.
 * Pinning a new message automatically unpins the current one.
 */
export async function pinMessage(
  messageId: string,
  userId: string,
  tripIdParam?: string,
): Promise<boolean> {
  try {
    const { data: message, error: fetchError } = await supabase
      .from('trip_chat_messages')
      .select('id, trip_id, payload')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      console.error('[chatService] Failed to fetch message for pinning:', fetchError);
      return false;
    }

    const tripId = tripIdParam ?? message.trip_id;
    if (!tripId) {
      console.error('[chatService] Message has no trip_id');
      return false;
    }

    // Unpin any existing pinned messages in this trip (single-pin model)
    const { data: existingPinned } = await supabase
      .from('trip_chat_messages')
      .select('id, payload')
      .eq('trip_id', tripId)
      .eq('is_deleted', false)
      .contains('payload', { pinned: true });

    for (const existing of existingPinned || []) {
      if (existing.id === messageId) continue;
      const curr = (existing.payload as Record<string, unknown>) || {};
      const cleaned = { ...curr };
      delete cleaned.pinned;
      delete cleaned.pinned_at;
      delete cleaned.pinned_by;
      await supabase
        .from('trip_chat_messages')
        .update({ payload: cleaned })
        .eq('id', existing.id);
    }

    // Pin the new message
    const currentPayload = (message.payload as Record<string, unknown>) || {};
    const newPayload = {
      ...currentPayload,
      pinned: true,
      pinned_at: new Date().toISOString(),
      pinned_by: userId,
    };

    const { error: updateError } = await supabase
      .from('trip_chat_messages')
      .update({ payload: newPayload })
      .eq('id', messageId);

    if (updateError) {
      console.error('[chatService] Failed to pin message:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[chatService] Unexpected error pinning message:', error);
    return false;
  }
}

/**
 * Unpin a chat message
 */
export async function unpinMessage(messageId: string): Promise<boolean> {
  try {
    const { data: message, error: fetchError } = await supabase
      .from('trip_chat_messages')
      .select('payload')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      console.error('[chatService] Failed to fetch message for unpinning:', fetchError);
      return false;
    }

    const currentPayload = (message.payload as Record<string, unknown>) || {};
    const newPayload = { ...currentPayload };
    delete newPayload.pinned;
    delete newPayload.pinned_at;
    delete newPayload.pinned_by;

    const { error: updateError } = await supabase
      .from('trip_chat_messages')
      .update({ payload: newPayload })
      .eq('id', messageId);

    if (updateError) {
      console.error('[chatService] Failed to unpin message:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[chatService] Unexpected error unpinning message:', error);
    return false;
  }
}

/**
 * Fetch the pinned message for a trip (single-pin model: at most one).
 */
export async function getPinnedMessages(tripId: string): Promise<Row[]> {
  try {
    const { data, error } = await supabase
      .from('trip_chat_messages')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_deleted', false)
      .contains('payload', { pinned: true })
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[chatService] Failed to fetch pinned messages:', error);
    return [];
  }
}
