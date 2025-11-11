/**
 * Read Receipts Service
 * Tracks and syncs message read status across users
 */
// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ReadStatus = Database['public']['Tables']['message_read_status']['Row'];
type ReadStatusInsert = Database['public']['Tables']['message_read_status']['Insert'];

/**
 * Mark a message as read for the current user
 */
export async function markMessageAsRead(messageId: string, tripId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('message_read_status')
    .upsert({
      message_id: messageId,
      user_id: userId,
      trip_id: tripId,
      read_at: new Date().toISOString(),
    }, {
      onConflict: 'message_id,user_id'
    });

  if (error) {
    console.error('Failed to mark message as read:', error);
    throw error;
  }
}

/**
 * Mark multiple messages as read
 */
export async function markMessagesAsRead(messageIds: string[], tripId: string, userId: string): Promise<void> {
  const readStatuses: ReadStatusInsert[] = messageIds.map(messageId => ({
    message_id: messageId,
    user_id: userId,
    trip_id: tripId,
    read_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('message_read_status')
    .upsert(readStatuses, {
      onConflict: 'message_id,user_id'
    });

  if (error) {
    console.error('Failed to mark messages as read:', error);
    throw error;
  }
}

/**
 * Get read status for a message
 */
export async function getMessageReadStatus(messageId: string): Promise<ReadStatus[]> {
  const { data, error } = await supabase
    .from('message_read_status')
    .select('*')
    .eq('message_id', messageId)
    .order('read_at', { ascending: false });

  if (error) {
    console.error('Failed to get read status:', error);
    return [];
  }

  return data || [];
}

/**
 * Get read status for multiple messages
 */
export async function getMessagesReadStatus(messageIds: string[]): Promise<Record<string, ReadStatus[]>> {
  const { data, error } = await supabase
    .from('message_read_status')
    .select('*')
    .in('message_id', messageIds);

  if (error) {
    console.error('Failed to get read statuses:', error);
    return {};
  }

  // Group by message_id
  const grouped: Record<string, ReadStatus[]> = {};
  (data || []).forEach(status => {
    if (!grouped[status.message_id]) {
      grouped[status.message_id] = [];
    }
    grouped[status.message_id].push(status);
  });

  return grouped;
}

/**
 * Subscribe to read receipt updates for a trip
 */
export function subscribeToReadReceipts(
  tripId: string,
  onRead: (status: ReadStatus) => void
) {
  return supabase
    .channel(`read_receipts:${tripId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message_read_status',
        filter: `trip_id=eq.${tripId}`
      },
      (payload) => {
        onRead(payload.new as ReadStatus);
      }
    )
    .subscribe();
}
