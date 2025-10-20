import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

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
  const { data, error } = await supabase
    .from('trip_chat_messages')
    .insert({
      ...msg,
      attachments: msg.attachments as any,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
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