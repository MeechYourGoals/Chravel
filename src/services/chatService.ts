import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { retryWithBackoff } from '@/utils/retry';

type Row = Database['public']['Tables']['trip_chat_messages']['Row'];
type Insert = Database['public']['Tables']['trip_chat_messages']['Insert'];

export type AttachmentType = 'image' | 'video' | 'file' | 'link';

export interface ChatMessageInsert extends Omit<Insert, 'attachments'> {
  attachments?: {
    type: AttachmentType;
    ref_id: string;
    url?: string;
  }[];
}

export async function sendChatMessage(msg: ChatMessageInsert) {
  return retryWithBackoff(
    async () => {
      // Ensure privacy_mode is always 'standard' or 'high' (never null, undefined, or empty string)
      const privacyMode = (msg.privacy_mode === 'high' ? 'high' : 'standard') as 'standard' | 'high';
      
      const { data, error } = await supabase
        .from('trip_chat_messages')
        .insert({
          ...msg,
          privacy_mode: privacyMode,
          attachments: msg.attachments as any,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    {
      maxRetries: 3,
      onRetry: (attempt, error) => {
        if (import.meta.env.DEV) {
          console.warn(`Retry attempt ${attempt}/3 for sending chat message:`, error.message);
        }
      }
    }
  );
}

export function subscribeToChatMessages(tripId: string, onInsert: (row: Row) => void) {
  return supabase
    .channel(`chat:${tripId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'trip_chat_messages', filter: `trip_id=eq.${tripId}` },
      payload => onInsert(payload.new as Row)
    )
    .subscribe();
}

/**
 * Edit a chat message
 */
export async function editChatMessage(
  messageId: string,
  newContent: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trip_chat_messages')
      .update({
        content: newContent,
        edited_at: new Date().toISOString(),
        is_edited: true
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
export async function editChannelMessage(
  messageId: string,
  newContent: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('channel_messages')
      .update({
        content: newContent,
        edited_at: new Date().toISOString()
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
        content: '[Message deleted]'
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
        content: '[Message deleted]'
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

export function subscribeToMediaUpdates(tripId: string, handlers: {
  onMediaInsert?: (row: Database['public']['Tables']['trip_media_index']['Row']) => void;
  onFileInsert?: (row: Database['public']['Tables']['trip_files']['Row']) => void;
  onLinkInsert?: (row: Database['public']['Tables']['trip_link_index']['Row']) => void;
}) {
  const channel = supabase.channel(`media:${tripId}`);

  if (handlers.onMediaInsert) {
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'trip_media_index', filter: `trip_id=eq.${tripId}` },
      payload => handlers.onMediaInsert!(payload.new as any)
    );
  }

  if (handlers.onFileInsert) {
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'trip_files', filter: `trip_id=eq.${tripId}` },
      payload => handlers.onFileInsert!(payload.new as any)
    );
  }

  if (handlers.onLinkInsert) {
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'trip_link_index', filter: `trip_id=eq.${tripId}` },
      payload => handlers.onLinkInsert!(payload.new as any)
    );
  }

  return channel.subscribe();
}