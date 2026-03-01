import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ReactionType = 'like' | 'love' | 'dislike' | 'important';

export type ChatMessageInsert = Database['public']['Tables']['trip_chat_messages']['Insert'];

export interface ReactionCount {
  count: number;
  userReacted: boolean;
}

type MessageRow = Database['public']['Tables']['trip_chat_messages']['Row'];
type MessageInsert = Database['public']['Tables']['trip_chat_messages']['Insert'];

// ─── Send messages ──────────────────────────────────────────────────────────

/**
 * Send a chat message. Accepts any fields matching the trip_chat_messages Insert type.
 */
export async function sendChatMessage(data: Record<string, unknown>): Promise<MessageRow> {
  // Extract only known insert fields
  const insertData: MessageInsert = {
    trip_id: data.trip_id as string,
    author_name: (data.author_name || data.sender_display_name || 'Unknown') as string,
    content: data.content as string,
    user_id: data.user_id as string | undefined,
    message_type: data.message_type as string | undefined,
    media_type: data.media_type as string | undefined,
    media_url: data.media_url as string | undefined,
    attachments: data.attachments as Json | undefined,
    client_message_id: data.client_message_id as string | undefined,
    privacy_mode: data.privacy_mode as string | undefined,
    payload: data.payload as Json | undefined,
    reply_to_id: data.reply_to_id as string | undefined,
    mentioned_user_ids: data.mentioned_user_ids as string[] | undefined,
  };

  const { data: result, error } = await supabase
    .from('trip_chat_messages')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[chatService] sendChatMessage error:', error);
    throw error;
  }
  return result;
}

/**
 * Send a rich chat message with client_message_id dedupe.
 */
export async function sendRichChatMessage(data: Record<string, unknown>): Promise<MessageRow> {
  // Dedupe by client_message_id if provided
  if (data.client_message_id) {
    const { data: existing } = await supabase
      .from('trip_chat_messages')
      .select('*')
      .eq('trip_id', data.trip_id as string)
      .eq('client_message_id', data.client_message_id as string)
      .maybeSingle();

    if (existing) return existing;
  }

  return sendChatMessage(data);
}

// ─── Edit / Delete ──────────────────────────────────────────────────────────

export async function editChatMessage(messageId: string, newContent: string): Promise<boolean> {
  const { error } = await supabase
    .from('trip_chat_messages')
    .update({ content: newContent, edited_at: new Date().toISOString(), is_edited: true })
    .eq('id', messageId);

  if (error) {
    console.error('[chatService] editChatMessage error:', error);
    return false;
  }
  return true;
}

export async function editChannelMessage(messageId: string, newContent: string): Promise<boolean> {
  const { error } = await supabase
    .from('channel_messages')
    .update({ content: newContent, edited_at: new Date().toISOString() })
    .eq('id', messageId);

  if (error) {
    console.error('[chatService] editChannelMessage error:', error);
    return false;
  }
  return true;
}

export async function deleteChatMessage(messageId: string): Promise<boolean> {
  const { error } = await supabase
    .from('trip_chat_messages')
    .update({ is_deleted: true })
    .eq('id', messageId);

  if (error) {
    console.error('[chatService] deleteChatMessage error:', error);
    return false;
  }
  return true;
}

export async function deleteChannelMessage(messageId: string): Promise<boolean> {
  const { error } = await supabase
    .from('channel_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId);

  if (error) {
    console.error('[chatService] deleteChannelMessage error:', error);
    return false;
  }
  return true;
}

// ─── Reactions (payload-based, no separate table) ───────────────────────────

interface PayloadReactions {
  [reactionType: string]: string[]; // array of user IDs
}

function getReactionsFromPayload(payload: unknown): PayloadReactions {
  const p = (payload as Record<string, unknown>) || {};
  return (p.reactions as PayloadReactions) || {};
}

export async function toggleMessageReaction(
  messageId: string,
  userId: string,
  reactionType: ReactionType,
): Promise<{ data: unknown; error: unknown }> {
  try {
    const { data: message, error: fetchError } = await supabase
      .from('trip_chat_messages')
      .select('payload')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) throw fetchError || new Error('Message not found');

    const currentPayload = (message.payload as Record<string, unknown>) || {};
    const reactions = getReactionsFromPayload(currentPayload);
    const users = reactions[reactionType] || [];
    const idx = users.indexOf(userId);

    if (idx >= 0) {
      users.splice(idx, 1);
    } else {
      users.push(userId);
    }

    const updatedReactions = { ...reactions, [reactionType]: users };
    // Clean up empty arrays
    for (const key of Object.keys(updatedReactions)) {
      if (updatedReactions[key].length === 0) delete updatedReactions[key];
    }

    const newPayload = { ...currentPayload, reactions: updatedReactions };

    const { error: updateError } = await supabase
      .from('trip_chat_messages')
      .update({ payload: newPayload as Json })
      .eq('id', messageId);

    if (updateError) throw updateError;

    return { data: { toggled: true }, error: null };
  } catch (error) {
    console.error('[chatService] toggleMessageReaction error:', error);
    return { data: null, error };
  }
}

export async function getMessagesReactions(
  messageIds: string[],
  currentUserId?: string,
): Promise<Record<string, Record<string, ReactionCount>>> {
  if (!messageIds.length) return {};

  try {
    const { data, error } = await supabase
      .from('trip_chat_messages')
      .select('id, payload')
      .in('id', messageIds);

    if (error) throw error;

    const result: Record<string, Record<string, ReactionCount>> = {};

    for (const row of data || []) {
      const reactions = getReactionsFromPayload(row.payload);
      if (Object.keys(reactions).length === 0) continue;

      result[row.id] = {};
      for (const [type, users] of Object.entries(reactions)) {
        result[row.id][type] = {
          count: users.length,
          userReacted: currentUserId ? users.includes(currentUserId) : false,
        };
      }
    }

    return result;
  } catch (error) {
    console.error('[chatService] getMessagesReactions error:', error);
    return {};
  }
}

interface ReactionPayload {
  messageId: string;
  reactionType: string;
  eventType: 'INSERT' | 'DELETE';
  userId: string;
}

export function subscribeToReactions(
  tripId: string,
  callback: (payload: ReactionPayload) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`reactions-${tripId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'trip_chat_messages',
        filter: `trip_id=eq.${tripId}`,
      },
      change => {
        // Detect reaction changes by comparing old vs new payload
        const newPayload = (change.new as Record<string, unknown>)?.payload as Record<
          string,
          unknown
        > | null;
        const oldPayload = (change.old as Record<string, unknown>)?.payload as Record<
          string,
          unknown
        > | null;
        const newReactions = getReactionsFromPayload(newPayload);
        const oldReactions = getReactionsFromPayload(oldPayload);

        const messageId = (change.new as Record<string, unknown>)?.id as string;
        if (!messageId) return;

        // Find added/removed reactions
        const allTypes = new Set([...Object.keys(newReactions), ...Object.keys(oldReactions)]);
        for (const type of allTypes) {
          const newUsers = new Set(newReactions[type] || []);
          const oldUsers = new Set(oldReactions[type] || []);

          for (const uid of newUsers) {
            if (!oldUsers.has(uid)) {
              callback({ messageId, reactionType: type, eventType: 'INSERT', userId: uid });
            }
          }
          for (const uid of oldUsers) {
            if (!newUsers.has(uid)) {
              callback({ messageId, reactionType: type, eventType: 'DELETE', userId: uid });
            }
          }
        }
      },
    )
    .subscribe();

  return channel;
}

// ─── Threads ────────────────────────────────────────────────────────────────

export async function getThreadReplies(parentMessageId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('trip_chat_messages')
    .select('*')
    .eq('reply_to_id', parentMessageId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[chatService] getThreadReplies error:', error);
    return [];
  }
  return data || [];
}

export async function sendThreadReply(
  parentMessageId: string,
  data: MessageInsert & Record<string, unknown>,
): Promise<MessageRow | null> {
  try {
    const result = await sendChatMessage({
      ...data,
      reply_to_id: parentMessageId,
    });
    return result;
  } catch (error) {
    console.error('[chatService] sendThreadReply error:', error);
    return null;
  }
}

export function subscribeToThreadReplies(
  parentMessageId: string,
  callback: (message: MessageRow) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`thread-${parentMessageId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_chat_messages',
        filter: `reply_to_id=eq.${parentMessageId}`,
      },
      change => {
        callback(change.new as MessageRow);
      },
    )
    .subscribe();

  return channel;
}

// ─── Media subscriptions ────────────────────────────────────────────────────

export function subscribeToMediaUpdates(
  tripId: string,
  callback: (message: MessageRow) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`media-${tripId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_chat_messages',
        filter: `trip_id=eq.${tripId}`,
      },
      change => {
        const msg = change.new as MessageRow;
        if (msg.media_url || msg.media_type) {
          callback(msg);
        }
      },
    )
    .subscribe();

  return channel;
}

// ─── Pin / Unpin ────────────────────────────────────────────────────────────

export async function pinMessage(
  messageId: string,
  userId: string,
  tripId?: string,
): Promise<boolean> {
  try {
    if (tripId) {
      const { data: existingPins } = await supabase
        .from('trip_chat_messages')
        .select('id, payload')
        .eq('trip_id', tripId)
        .eq('is_deleted', false)
        .not('payload', 'is', null);

      if (existingPins) {
        for (const pin of existingPins) {
          const payload = (pin.payload as Record<string, unknown>) || {};
          if (!payload.pinned) continue;
          if (pin.id === messageId) continue;

          const newPayload = { ...payload };
          delete newPayload.pinned;
          delete newPayload.pinned_at;
          delete newPayload.pinned_by;

          await supabase
            .from('trip_chat_messages')
            .update({ payload: newPayload as Json })
            .eq('id', pin.id);
        }
      }
    }

    const { data: message, error: fetchError } = await supabase
      .from('trip_chat_messages')
      .select('payload')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      console.error('[chatService] Failed to fetch message for pinning:', fetchError);
      return false;
    }

    const currentPayload = (message.payload as Record<string, unknown>) || {};
    const newPayload = {
      ...currentPayload,
      pinned: true,
      pinned_at: new Date().toISOString(),
      pinned_by: userId,
    };

    const { error: updateError } = await supabase
      .from('trip_chat_messages')
      .update({ payload: newPayload as Json })
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
      .update({ payload: newPayload as Json })
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

export async function getPinnedMessages(tripId: string): Promise<MessageRow[]> {
  try {
    const { data, error } = await supabase
      .from('trip_chat_messages')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_deleted', false)
      .contains('payload', { pinned: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[chatService] Failed to fetch pinned messages:', error);
    return [];
  }
}
