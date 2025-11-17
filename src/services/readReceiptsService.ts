/**
 * Read Receipts Service
 *
 * Manages message read receipts for both channel messages and trip messages
 * Provides real-time tracking of who has read which messages
 *
 * Features:
 * - Mark messages as read
 * - Get read receipts for a message
 * - Get unread message count
 * - Real-time subscription support
 * - Demo mode compatibility
 */

import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { MessageReadReceipt } from '@/types/messages';

type ReadReceipt = Database['public']['Tables']['message_read_receipts']['Row'];
type ReadReceiptInsert = Database['public']['Tables']['message_read_receipts']['Insert'];

export interface MarkAsReadParams {
  messageId: string;
  userId: string;
  messageType: 'channel' | 'trip';
}

export interface GetReadReceiptsParams {
  messageId: string;
  messageType: 'channel' | 'trip';
}

/**
 * Demo mode storage key generator
 */
function getDemoReceiptsKey(messageId: string): string {
  return `demo_read_receipts_${messageId}`;
}

/**
 * Get demo read receipts from localStorage
 */
function getDemoReceipts(messageId: string): MessageReadReceipt[] {
  try {
    const stored = localStorage.getItem(getDemoReceiptsKey(messageId));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[ReadReceiptsService] Failed to parse demo receipts:', error);
    return [];
  }
}

/**
 * Save demo read receipts to localStorage
 */
function saveDemoReceipts(messageId: string, receipts: MessageReadReceipt[]): void {
  try {
    localStorage.setItem(getDemoReceiptsKey(messageId), JSON.stringify(receipts));
  } catch (error) {
    console.error('[ReadReceiptsService] Failed to save demo receipts:', error);
  }
}

/**
 * Mark a message as read by the current user
 */
export async function markMessageAsRead(
  params: MarkAsReadParams,
  isDemoMode: boolean
): Promise<boolean> {
  const { messageId, userId, messageType } = params;

  console.debug('[ReadReceiptsService] Marking message as read', {
    messageId,
    userId,
    messageType,
    isDemoMode
  });

  if (isDemoMode) {
    // Demo mode: Store in localStorage
    const receipts = getDemoReceipts(messageId);

    // Check if already read
    const existingReceipt = receipts.find(r => r.userId === userId);
    if (existingReceipt) {
      return true; // Already marked as read
    }

    const newReceipt: MessageReadReceipt = {
      messageId,
      userId,
      readAt: new Date().toISOString()
    };

    receipts.push(newReceipt);
    saveDemoReceipts(messageId, receipts);

    console.info('[ReadReceiptsService] ✅ Demo receipt recorded');
    return true;
  }

  // Authenticated mode: Store in Supabase
  try {
    // First check if already read
    const { data: existing } = await supabase
      .from('message_read_receipts')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('message_type', messageType)
      .maybeSingle();

    if (existing) {
      return true; // Already marked as read
    }

    const receiptData: ReadReceiptInsert = {
      message_id: messageId,
      user_id: userId,
      message_type: messageType,
      read_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('message_read_receipts')
      .insert(receiptData);

    if (error) {
      console.error('[ReadReceiptsService] ❌ Insert error', error);
      return false;
    }

    console.info('[ReadReceiptsService] ✅ Receipt recorded');
    return true;
  } catch (error) {
    console.error('[ReadReceiptsService] ❌ Unexpected error', error);
    return false;
  }
}

/**
 * Get all read receipts for a message
 */
export async function getMessageReadReceipts(
  params: GetReadReceiptsParams,
  isDemoMode: boolean
): Promise<MessageReadReceipt[]> {
  const { messageId, messageType } = params;

  console.debug('[ReadReceiptsService] Fetching read receipts', {
    messageId,
    messageType,
    isDemoMode
  });

  if (isDemoMode) {
    // Demo mode: Load from localStorage
    return getDemoReceipts(messageId);
  }

  // Authenticated mode: Query Supabase
  try {
    const { data, error } = await supabase
      .from('message_read_receipts')
      .select('message_id, user_id, read_at')
      .eq('message_id', messageId)
      .eq('message_type', messageType)
      .order('read_at', { ascending: true });

    if (error) {
      console.error('[ReadReceiptsService] ❌ Fetch error', error);
      return [];
    }

    // Transform to MessageReadReceipt format
    return (data || []).map(row => ({
      messageId: row.message_id,
      userId: row.user_id,
      readAt: row.read_at
    }));
  } catch (error) {
    console.error('[ReadReceiptsService] ❌ Unexpected error', error);
    return [];
  }
}

/**
 * Get unread message count for a user in a trip/channel
 */
export async function getUnreadMessageCount(
  tripId: string,
  userId: string,
  channelId?: string,
  isDemoMode: boolean = false
): Promise<number> {
  console.debug('[ReadReceiptsService] Fetching unread count', {
    tripId,
    userId,
    channelId,
    isDemoMode
  });

  if (isDemoMode) {
    // Demo mode: Can't accurately track across localStorage
    // Return 0 for simplicity
    return 0;
  }

  try {
    if (channelId) {
      // Count unread channel messages
      const { count, error } = await supabase
        .from('channel_messages')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', channelId)
        .neq('sender_id', userId) // Don't count own messages
        .filter('id', 'not.in', `(
          SELECT message_id
          FROM message_read_receipts
          WHERE user_id = '${userId}'
          AND message_type = 'channel'
        )`);

      if (error) {
        console.error('[ReadReceiptsService] ❌ Count error', error);
        return 0;
      }

      return count || 0;
    } else {
      // Count unread trip messages (all channels)
      // This is more complex and would need a join or RPC function
      // For now, return 0
      return 0;
    }
  } catch (error) {
    console.error('[ReadReceiptsService] ❌ Unexpected error', error);
    return 0;
  }
}

/**
 * Mark all messages in a channel as read
 */
export async function markAllAsRead(
  channelId: string,
  userId: string,
  messageType: 'channel' | 'trip',
  isDemoMode: boolean
): Promise<boolean> {
  console.info('[ReadReceiptsService] Marking all messages as read', {
    channelId,
    userId,
    messageType,
    isDemoMode
  });

  if (isDemoMode) {
    // Demo mode: Not feasible without a server
    return true;
  }

  try {
    // Get all unread messages in the channel
    const { data: messages, error: fetchError } = await supabase
      .from('channel_messages')
      .select('id')
      .eq('channel_id', channelId)
      .neq('sender_id', userId);

    if (fetchError) {
      console.error('[ReadReceiptsService] ❌ Fetch error', fetchError);
      return false;
    }

    if (!messages || messages.length === 0) {
      return true; // No messages to mark
    }

    // Filter out already read messages
    const { data: existingReceipts } = await supabase
      .from('message_read_receipts')
      .select('message_id')
      .eq('user_id', userId)
      .eq('message_type', messageType)
      .in('message_id', messages.map(m => m.id));

    const readMessageIds = new Set((existingReceipts || []).map(r => r.message_id));
    const unreadMessages = messages.filter(m => !readMessageIds.has(m.id));

    if (unreadMessages.length === 0) {
      return true; // All already read
    }

    // Create receipts for all unread messages
    const receipts: ReadReceiptInsert[] = unreadMessages.map(msg => ({
      message_id: msg.id,
      user_id: userId,
      message_type: messageType,
      read_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('message_read_receipts')
      .insert(receipts);

    if (insertError) {
      console.error('[ReadReceiptsService] ❌ Insert error', insertError);
      return false;
    }

    console.info('[ReadReceiptsService] ✅ Marked all as read', {
      count: receipts.length
    });
    return true;
  } catch (error) {
    console.error('[ReadReceiptsService] ❌ Unexpected error', error);
    return false;
  }
}

/**
 * Subscribe to read receipt changes for a message
 */
export function subscribeToReadReceipts(
  messageId: string,
  messageType: 'channel' | 'trip',
  callback: (receipts: MessageReadReceipt[]) => void
) {
  const channel = supabase
    .channel(`read_receipts_${messageId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message_read_receipts',
        filter: `message_id=eq.${messageId}`
      },
      async (payload) => {
        // Fetch all receipts for this message
        const receipts = await getMessageReadReceipts(
          { messageId, messageType },
          false
        );
        callback(receipts);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
