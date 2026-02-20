import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { userPreferencesService } from '@/services/userPreferencesService';
import type { TripPreferences } from '@/types/consumer';

const QUERY_KEY = ['aiConciergePreferences'] as const;
const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes - preferences change rarely

/**
 * Loads user's global AI Concierge preferences once and caches them.
 * Pass these to the concierge request body so the server can skip fetching.
 */
export function useAIConciergePreferences(): TripPreferences | undefined {
  const { user } = useAuth();

  const { data: preferences } = useQuery({
    queryKey: [...QUERY_KEY, user?.id ?? 'anon'],
    queryFn: async (): Promise<TripPreferences> => {
      if (!user) {
        return {
          dietary: [],
          vibe: [],
          accessibility: [],
          business: [],
          entertainment: [],
          lifestyle: [],
          budgetMin: 0,
          budgetMax: 1000,
          budgetUnit: 'experience',
          timePreference: 'flexible',
        };
      }
      return userPreferencesService.getAIPreferences(user.id);
    },
    enabled: !!user,
    staleTime: STALE_TIME_MS,
  });

  return preferences;
}
