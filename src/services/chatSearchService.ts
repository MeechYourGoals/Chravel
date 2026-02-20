/**
 * Chat Search Service
 * Provides safe search across Messages and Broadcasts ONLY
 * CRITICAL: Never accesses channels, channel_messages, or channel_members
 */
import { supabase } from '@/integrations/supabase/client';
import type { ParsedMessageSearchQuery } from '@/lib/parseMessageSearchQuery';

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
 * Resolve sender name to user_id(s) by matching trip members.
 * Partial match: "Coach" matches "Coach Mike".
 * Deterministic: exact > startsWith > contains.
 */
export async function resolveSenderNameToIds(
  tripId: string,
  senderName: string,
): Promise<string[]> {
  if (!senderName.trim()) return [];

  const { data: members } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .or('status.is.null,status.eq.active');

  const userIds = [...new Set((members || []).map(m => m.user_id).filter(Boolean))] as string[];
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles_public')
    .select('user_id, display_name, resolved_display_name, first_name, last_name')
    .in('user_id', userIds);

  const query = senderName.trim().toLowerCase();
  const matches: Array<{ user_id: string; rank: number }> = [];

  for (const p of profiles || []) {
    const resolved = (p.resolved_display_name || p.display_name || '').trim();
    const display = (p.display_name || '').trim();
    const fullName = `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim();
    const candidates = [resolved, display, fullName].filter(Boolean);

    for (const name of candidates) {
      const lower = name.toLowerCase();
      if (lower === query) {
        matches.push({ user_id: p.user_id, rank: 0 });
        break;
      }
      if (lower.startsWith(query)) {
        matches.push({ user_id: p.user_id, rank: 1 });
        break;
      }
      if (lower.includes(query)) {
        matches.push({ user_id: p.user_id, rank: 2 });
        break;
      }
    }
  }

  if (matches.length === 0) return [];

  matches.sort((a, b) => a.rank - b.rank);
  const bestRank = matches[0].rank;
  return matches.filter(m => m.rank === bestRank).map(m => m.user_id);
}

/**
 * Search trip messages - NEVER accesses channel data
 */
export async function searchTripMessages(
  tripId: string,
  query: string,
  limit: number = 50,
): Promise<MessageSearchResult[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from('trip_chat_messages')
    .select(
      `
      id,
      content,
      author_name,
      user_id,
      created_at
    `,
    )
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
    type: 'message' as const,
  }));
}

/**
 * Search broadcasts - NEVER accesses channel data
 */
export async function searchBroadcasts(
  tripId: string,
  query: string,
  limit: number = 50,
): Promise<BroadcastSearchResult[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from('broadcasts')
    .select(
      `
      id,
      message,
      created_by,
      priority,
      created_at
    `,
    )
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
      p.resolved_display_name ||
        p.display_name ||
        `${p.first_name || ''} ${p.last_name || ''}`.trim() ||
        'Unknown',
    ]),
  );

  return (data || []).map(broadcast => ({
    ...broadcast,
    created_by_name: profileMap.get(broadcast.created_by) || 'Unknown',
    type: 'broadcast' as const,
  }));
}

/**
 * Search trip messages with filters (sender only)
 */
async function searchTripMessagesWithFilters(
  tripId: string,
  parsed: ParsedMessageSearchQuery,
  limit: number = 50,
): Promise<MessageSearchResult[]> {
  let query = supabase
    .from('trip_chat_messages')
    .select('id, content, author_name, user_id, created_at')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (parsed.text.trim()) {
    query = query.ilike('content', `%${parsed.text}%`);
  } else if (!parsed.sender) {
    return [];
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to search messages:', error);
    return [];
  }

  let results = (data || []).map(msg => ({ ...msg, type: 'message' as const }));

  if (parsed.sender) {
    const senderIds = await resolveSenderNameToIds(tripId, parsed.sender);
    if (senderIds.length === 0) return [];
    results = results.filter(m => m.user_id && senderIds.includes(m.user_id));
  }

  return results;
}

/**
 * Search broadcasts with filters (sender only)
 * When allowEmptyContent (e.g. user typed "broadcast" only), return all matching broadcasts.
 */
async function searchBroadcastsWithFilters(
  tripId: string,
  parsed: ParsedMessageSearchQuery,
  limit: number = 50,
  allowEmptyContent: boolean = false,
): Promise<BroadcastSearchResult[]> {
  const hasAnyFilter = parsed.text.trim() || parsed.sender;

  if (!hasAnyFilter && !allowEmptyContent) return [];

  let query = supabase
    .from('broadcasts')
    .select('id, message, created_by, priority, created_at')
    .eq('trip_id', tripId)
    .eq('is_sent', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (parsed.text.trim()) {
    query = query.ilike('message', `%${parsed.text}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to search broadcasts:', error);
    return [];
  }

  let results = data || [];

  if (parsed.sender) {
    const senderIds = await resolveSenderNameToIds(tripId, parsed.sender);
    if (senderIds.length === 0) return [];
    results = results.filter(b => senderIds.includes(b.created_by));
  }

  const creatorIds = [...new Set(results.map(b => b.created_by))];
  const { data: profiles } = await supabase
    .from('profiles_public')
    .select('user_id, display_name, resolved_display_name, first_name, last_name')
    .in('user_id', creatorIds);

  const profileMap = new Map(
    (profiles || []).map(p => [
      p.user_id,
      p.resolved_display_name ||
        p.display_name ||
        `${p.first_name || ''} ${p.last_name || ''}`.trim() ||
        'Unknown',
    ]),
  );

  return results.map(broadcast => ({
    ...broadcast,
    created_by_name: profileMap.get(broadcast.created_by) || 'Unknown',
    type: 'broadcast' as const,
  }));
}

/**
 * Search both messages and broadcasts simultaneously
 */
export async function searchChatContent(
  tripId: string,
  query: string,
): Promise<{
  messages: MessageSearchResult[];
  broadcasts: BroadcastSearchResult[];
}> {
  const [messages, broadcasts] = await Promise.all([
    searchTripMessages(tripId, query),
    searchBroadcasts(tripId, query),
  ]);

  return { messages, broadcasts };
}

/**
 * Search with parsed filters (sender, broadcast-only, weekday, date range).
 * When isBroadcastOnly: only search broadcasts, skip messages.
 * Backward compatible: if no filters and plain text, behaves like searchChatContent.
 */
export async function searchChatContentWithFilters(
  tripId: string,
  parsed: ParsedMessageSearchQuery,
): Promise<{
  messages: MessageSearchResult[];
  broadcasts: BroadcastSearchResult[];
}> {
  const hasFilters = parsed.sender || parsed.isBroadcastOnly;

  if (!hasFilters && parsed.text.trim()) {
    return searchChatContent(tripId, parsed.text);
  }

  const searchMessages = !parsed.isBroadcastOnly;
  const searchBroadcastsFlag = true;

  const allowEmptyBroadcast = parsed.isBroadcastOnly && !parsed.text.trim() && !parsed.sender;

  const [messages, broadcasts] = await Promise.all([
    searchMessages ? searchTripMessagesWithFilters(tripId, parsed) : Promise.resolve([]),
    searchBroadcastsFlag
      ? searchBroadcastsWithFilters(tripId, parsed, 50, allowEmptyBroadcast)
      : Promise.resolve([]),
  ]);

  return { messages, broadcasts };
}
