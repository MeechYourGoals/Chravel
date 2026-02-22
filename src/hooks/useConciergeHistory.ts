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

interface RpcHistoryRow {
  role: string;
  content: string;
  created_at: string | null;
}

const VALID_TRIP_ID = /^[a-zA-Z0-9_-]{1,50}$/;

function isValidTripId(tripId: string): boolean {
  return !!tripId && tripId !== 'unknown' && tripId !== '' && VALID_TRIP_ID.test(tripId);
}

/**
 * Fetches the authenticated user's persisted AI concierge history for a trip.
 *
 * Uses the get_concierge_trip_history RPC which:
 *  - filters by auth.uid() server-side (never trusts client user_id)
 *  - returns alternating user/assistant message pairs in chronological order
 *  - is executable by authenticated role only
 *
 * Returns data in the ChatMessage shape used by AIConciergeChat so the caller
 * can hydrate the messages state directly.
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
      const { data: rows, error: rpcError } = await (supabase.rpc as any)(
        'get_concierge_trip_history',
        { p_trip_id: tripId, p_limit: 10 },
      );

      if (rpcError) {
        throw new Error(rpcError.message ?? 'Failed to fetch concierge history');
      }

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return [];
      }

      return (rows as unknown as RpcHistoryRow[]).map((row, idx) => ({
        id: `history-${row.created_at ?? Date.now()}-${idx}`,
        type: (row.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: row.content,
        timestamp: row.created_at ?? new Date().toISOString(),
      }));
    },
    enabled,
    staleTime: 30 * 1000, // 30 s — aligns with TripContextBuilder cache TTL
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
