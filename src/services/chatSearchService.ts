/**
 * Chat Search Service
 * Provides safe search across Messages and Broadcasts ONLY
 * CRITICAL: Never accesses channels, channel_messages, or channel_members
 */
import { supabase } from '@/integrations/supabase/client';

export interface MessageSearchResult {
  id: string;
  content: string;
  author_name: string;
  user_id: string | null;
  created_at: string;
  type: 'message';
}

export interface BroadcastSearchResult {
  id: string;
  message: string;
  created_by: string;
  created_by_name: string;
  priority: string | null;
  created_at: string;
  type: 'broadcast';
}

/**
 * Search trip messages - NEVER accesses channel data
 */
export async function searchTripMessages(
  tripId: string,
  query: string,
  limit: number = 50
): Promise<MessageSearchResult[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from('trip_chat_messages')
    .select(`
      id,
      content,
      author_name,
      user_id,
      created_at
    `)
    .eq('trip_id', tripId)
    .ilike('content', `%${query}%`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to search messages:', error);
    return [];
  }

  return (data || []).map(msg => ({
    ...msg,
    type: 'message' as const
  }));
}

/**
 * Search broadcasts - NEVER accesses channel data
 */
export async function searchBroadcasts(
  tripId: string,
  query: string,
  limit: number = 50
): Promise<BroadcastSearchResult[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from('broadcasts')
    .select(`
      id,
      message,
      created_by,
      priority,
      created_at
    `)
    .eq('trip_id', tripId)
    .eq('is_sent', true)
    .ilike('message', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to search broadcasts:', error);
    return [];
  }

  // Fetch creator names from profiles (use public view for co-member data)
  const creatorIds = [...new Set(data?.map(b => b.created_by) || [])];
  const { data: profiles } = await supabase
    .from('profiles_public')
    .select('user_id, display_name, resolved_display_name, first_name, last_name')
    .in('user_id', creatorIds);

  const profileMap = new Map(
    (profiles || []).map(p => [
      p.user_id,
      p.resolved_display_name || p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown'
    ])
  );

  return (data || []).map(broadcast => ({
    ...broadcast,
    created_by_name: profileMap.get(broadcast.created_by) || 'Unknown',
    type: 'broadcast' as const
  }));
}

/**
 * Search both messages and broadcasts simultaneously
 */
export async function searchChatContent(
  tripId: string,
  query: string
): Promise<{
  messages: MessageSearchResult[];
  broadcasts: BroadcastSearchResult[];
}> {
  const [messages, broadcasts] = await Promise.all([
    searchTripMessages(tripId, query),
    searchBroadcasts(tripId, query)
  ]);

  return { messages, broadcasts };
}
