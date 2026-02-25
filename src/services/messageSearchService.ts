/**
 * Message Search Service
 * Provides full-text search capabilities for chat messages
 */
import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
  trip_id: string;
  match_score?: number;
}

/**
 * Search messages in a trip using PostgreSQL full-text search
 */
export async function searchMessages(
  tripId: string,
  query: string,
  limit: number = 50,
): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  // Use PostgreSQL ILIKE for simple search (can be upgraded to full-text search with tsvector)
  const { data, error } = await supabase
    .from('trip_chat_messages')
    .select('id, content, author_name, created_at, trip_id')
    .eq('trip_id', tripId)
    .ilike('content', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to search messages:', error);
    return [];
  }

  return (data || []).map(msg => ({
    id: msg.id,
    content: msg.content,
    author_name: msg.author_name,
    created_at: msg.created_at,
    trip_id: msg.trip_id,
  }));
}

/**
 * Search messages by author
 */
export async function searchMessagesByAuthor(
  tripId: string,
  authorName: string,
  limit: number = 50,
): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('trip_chat_messages')
    .select('id, content, author_name, created_at, trip_id')
    .eq('trip_id', tripId)
    .ilike('author_name', `%${authorName}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to search messages by author:', error);
    return [];
  }

  return data || [];
}

/**
 * Search messages within a date range
 */
export async function searchMessagesByDateRange(
  tripId: string,
  startDate: string,
  endDate: string,
  limit: number = 100,
): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('trip_chat_messages')
    .select('id, content, author_name, created_at, trip_id')
    .eq('trip_id', tripId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to search messages by date range:', error);
    return [];
  }

  return data || [];
}
