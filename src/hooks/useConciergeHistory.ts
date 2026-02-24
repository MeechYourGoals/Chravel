import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shape that AIConciergeChat uses internally for messages.
 * Mirrored here to avoid a circular import from AIConciergeChat.
 */
export interface ConciergeChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const VALID_TRIP_ID = /^[a-zA-Z0-9_-]{1,50}$/;

function isValidTripId(tripId: string): boolean {
  return !!tripId && tripId !== 'unknown' && tripId !== '' && VALID_TRIP_ID.test(tripId);
}

/**
 * Fetches the authenticated user's persisted AI concierge history for a trip.
 *
 * Queries the `ai_queries` table directly (the previous RPC
 * `get_concierge_trip_history` does not exist in the database).
 *
 * Each row in `ai_queries` contains both the user's query and the assistant's
 * response, so we map each row into two ConciergeChatMessage entries.
 */
export function useConciergeHistory(tripId: string): {
  data: ConciergeChatMessage[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { user } = useAuth();
  const enabled = isValidTripId(tripId) && !!user;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['conciergeHistory', tripId, user?.id ?? 'anon'],
    queryFn: async (): Promise<ConciergeChatMessage[]> => {
      if (!user?.id) return [];

      const { data: rows, error: queryError } = await supabase
        .from('ai_queries')
        .select('id, query_text, response_text, created_at')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (queryError) {
        throw new Error(queryError.message ?? 'Failed to fetch concierge history');
      }

      if (!rows || rows.length === 0) {
        return [];
      }

      const messages: ConciergeChatMessage[] = [];

      rows.forEach((row, idx) => {
        const ts = row.created_at ?? new Date().toISOString();

        // User message
        if (row.query_text) {
          messages.push({
            id: `history-user-${row.id}-${idx}`,
            type: 'user',
            content: row.query_text,
            timestamp: ts,
          });
        }

        // Assistant response
        if (row.response_text) {
          messages.push({
            id: `history-assistant-${row.id}-${idx}`,
            type: 'assistant',
            content: row.response_text,
            timestamp: ts,
          });
        }
      });

      return messages;
    },
    enabled,
    staleTime: 30 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    data: data ?? [],
    isLoading: enabled ? isLoading : false,
    error: error as Error | null,
    refetch,
  };
}
