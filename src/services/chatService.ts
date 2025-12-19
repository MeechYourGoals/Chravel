import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { retryWithBackoff } from '@/utils/retry';
import type { RichChatAttachment, RichLinkPreview } from '@/types/chatAttachment';

type Row = Database['public']['Tables']['trip_chat_messages']['Row'];
type Insert = Database['public']['Tables']['trip_chat_messages']['Insert'];

export type AttachmentType = 'image' | 'video' | 'file' | 'link';
export type RichMessageType = 'text' | 'image' | 'video' | 'file' | 'link' | 'broadcast' | 'payment' | 'system';

export interface ChatMessageInsert extends Omit<Insert, 'attachments'> {
  attachments?: {
    type: AttachmentType;
    ref_id: string;
    url?: string;
  }[];
  message_type?: 'text' | 'broadcast' | 'payment' | 'system';
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

export async function sendChatMessage(msg: ChatMessageInsert) {
  return retryWithBackoff(
    async () => {
      const { data, error } = await supabase
        .from('trip_chat_messages')
        .insert({
          ...msg,
          privacy_mode: msg.privacy_mode || 'standard',
          message_type: msg.message_type || 'text',
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

/**
 * Send a rich media chat message with client_message_id for deduplication
 */
export async function sendRichChatMessage(msg: RichChatMessageInsert) {
  return retryWithBackoff(
    async () => {
      const insertPayload: any = {
        trip_id: msg.trip_id,
        content: msg.content,
        author_name: msg.author_name,
        user_id: msg.user_id,
        privacy_mode: msg.privacy_mode || 'standard',
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
          console.warn('[chatService] Duplicate message detected, fetching existing:', msg.client_message_id);
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
      
      return data;
    },
    {
      maxRetries: 3,
      onRetry: (attempt, error) => {
        if (import.meta.env.DEV) {
          console.warn(`Retry attempt ${attempt}/3 for sending rich chat message:`, error.message);
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
        is_deleted: true
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
        deleted_at: new Date().toISOString()
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