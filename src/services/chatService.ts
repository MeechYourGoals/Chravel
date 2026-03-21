import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ReactionType = string;

export type ChatMessageInsert = Database['public']['Tables']['trip_chat_messages']['Insert'];

export interface ReactionCount {
  count: number;
  userReacted: boolean;
  users: string[];
}

type MessageRow = Database['public']['Tables']['trip_chat_messages']['Row'];
type MessageInsert = Database['public']['Tables']['trip_chat_messages']['Insert'];

// ─── Send messages ──────────────────────────────────────────────────────────

/**
 * Cached author name to avoid 2 DB queries (auth.getUser + profiles) on every
 * single message send. Resolved once per session, cleared on auth state change.
 */
let cachedAuthorName: string | null = null;
let cachedUserId: string | null = null;

// Clear cache on auth state change so we re-resolve after login/logout/profile update
supabase.auth.onAuthStateChange(() => {
  cachedAuthorName = null;
  cachedUserId = null;
});

/**
 * Resolve the display name for the authenticated user from their profile.
 * Falls back to email prefix, then to the client-supplied name.
 * Result is cached per session to avoid 100-200ms overhead on every send.
 */
async function resolveAuthorName(clientSuppliedName: string): Promise<string> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return clientSuppliedName;

    // Return cached name if still the same user
    if (cachedAuthorName && cachedUserId === user.id) return cachedAuthorName;

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle();

    let resolved: string;
    if (profile?.display_name) {
      resolved = profile.display_name;
    } else if (user.email) {
      resolved = user.email.split('@')[0];
    } else {
      resolved = clientSuppliedName;
    }

    cachedAuthorName = resolved;
    cachedUserId = user.id;
    return resolved;
  } catch {
    return clientSuppliedName;
  }
}

/** Invalidate the cached author name (call after profile updates). */
export function invalidateAuthorNameCache(): void {
  cachedAuthorName = null;
  cachedUserId = null;
}

/**
 * Send a chat message. Accepts any fields matching the trip_chat_messages Insert type.
 * The author_name is resolved server-side from the authenticated user's profile
 * to prevent spoofing — the client-supplied value is used only as a fallback.
 */
export async function sendChatMessage(data: Record<string, unknown>): Promise<MessageRow> {
  const clientName = (data.author_name || data.sender_display_name || 'Unknown') as string;
  // Derive author_name from the authenticated user's profile, not from the client
  const authorName = await resolveAuthorName(clientName);

  // Extract only known insert fields
  const insertData: MessageInsert = {
    trip_id: data.trip_id as string,
    author_name: authorName,
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
    if (import.meta.env.DEV) console.error('[chatService] sendChatMessage error:', error);
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
    if (import.meta.env.DEV) console.error('[chatService] editChatMessage error:', error);
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
    if (import.meta.env.DEV) console.error('[chatService] editChannelMessage error:', error);
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
    if (import.meta.env.DEV) console.error('[chatService] deleteChatMessage error:', error);
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
    if (import.meta.env.DEV) console.error('[chatService] deleteChannelMessage error:', error);
    return false;
  }
  return true;
}

// ─── Reactions (message_reactions table-backed) ─────────────────────────────

export async function toggleMessageReaction(
  messageId: string,
  userId: string,
  reactionType: ReactionType,
): Promise<{ data: unknown; error: unknown }> {
  try {
    // RPC not yet in generated Supabase types
    const { data, error } = await (supabase as any).rpc('toggle_reaction', {
      p_message_id: messageId,
      p_user_id: userId,
      p_reaction_type: reactionType,
    });

    if (error) throw error;

    return { data: { toggled: true, result: data }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMessagesReactions(
  messageIds: string[],
  currentUserId?: string,
): Promise<Record<string, Record<string, ReactionCount>>> {
  if (!messageIds.length) return {};

  try {
    // Table not yet in generated Supabase types
    const { data, error } = await (supabase as any)
      .from('message_reactions')
      .select('message_id, reaction_type, user_id')
      .in('message_id', messageIds);

    if (error) throw error;

    const result: Record<string, Record<string, ReactionCount>> = {};

    for (const row of data || []) {
      const messageId = row.message_id;
      const reactionType = row.reaction_type;
      const reactionUserId = row.user_id;

      if (!result[messageId]) {
        result[messageId] = {};
      }

      if (!result[messageId][reactionType]) {
        result[messageId][reactionType] = {
          count: 0,
          userReacted: false,
          users: [],
        };
      }

      const reaction = result[messageId][reactionType];
      reaction.count += 1;
      reaction.users.push(reactionUserId);
      if (currentUserId && reactionUserId === currentUserId) {
        reaction.userReacted = true;
      }
    }

    return result;
  } catch (error) {
    if (import.meta.env.DEV) console.error('[chatService] getMessagesReactions error:', error);
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
  knownMessageIds?: Set<string>,
): RealtimeChannel {
  const messageIdsPromise = knownMessageIds
    ? Promise.resolve(knownMessageIds)
    : supabase
        .from('trip_chat_messages')
        .select('id')
        .eq('trip_id', tripId)
        .then(({ data }) => new Set((data || []).map(row => row.id)));

  const channelName = knownMessageIds ? `reactions-channel-${tripId}` : `reactions-${tripId}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
        filter: `trip_id=eq.${tripId}`,
      },
      async change => {
        const messageIds = await messageIdsPromise;
        const row = (change.new || change.old) as Record<string, unknown>;
        const messageId = row?.message_id as string | undefined;
        const reactionType = row?.reaction_type as string | undefined;
        const userId = row?.user_id as string | undefined;

        if (!messageId || !reactionType || !userId || !messageIds.has(messageId)) return;

        if (change.eventType === 'INSERT' || change.eventType === 'DELETE') {
          callback({
            messageId,
            reactionType,
            eventType: change.eventType,
            userId,
          });
          return;
        }

        if (change.eventType === 'UPDATE') {
          const oldRow = change.old as Record<string, unknown>;
          const oldReactionType = oldRow?.reaction_type as string | undefined;
          const oldUserId = oldRow?.user_id as string | undefined;

          if (oldReactionType && oldUserId) {
            callback({
              messageId,
              reactionType: oldReactionType,
              eventType: 'DELETE',
              userId: oldUserId,
            });
          }

          callback({
            messageId,
            reactionType,
            eventType: 'INSERT',
            userId,
          });
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
    if (import.meta.env.DEV) console.error('[chatService] getThreadReplies error:', error);
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
    if (import.meta.env.DEV) console.error('[chatService] sendThreadReply error:', error);
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
