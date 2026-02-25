import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PrivacyMode } from '@/types/privacy';

export interface TripPrivacyConfig {
  trip_id: string;
  privacy_mode: PrivacyMode;
  ai_access_enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch a trip's privacy configuration from trip_privacy_configs table.
 * Used to determine if messages should be encrypted (High Privacy mode).
 */
export const useTripPrivacyConfig = (tripId: string | undefined) => {
  return useQuery({
    queryKey: ['tripPrivacyConfig', tripId],
    queryFn: async (): Promise<TripPrivacyConfig | null> => {
      if (!tripId) return null;

      const { data, error } = await supabase
        .from('trip_privacy_configs')
        .select('*')
        .eq('trip_id', tripId)
        .maybeSingle();

      if (error) {
        console.error('[useTripPrivacyConfig] Error fetching config:', error);
        // Return default standard config on error
        return null;
      }

      return data as TripPrivacyConfig | null;
    },
    enabled: !!tripId,
    staleTime: 60000, // Cache for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes
  });
};

/**
 * Get the effective privacy mode for a trip.
 * Returns 'standard' if no config found.
 */
export const getEffectivePrivacyMode = (
  config: TripPrivacyConfig | null | undefined,
): PrivacyMode => {
  return config?.privacy_mode || 'standard';
};

/**
 * Check if high privacy mode is enabled for a trip
 */
export const isHighPrivacy = (config: TripPrivacyConfig | null | undefined): boolean => {
  return config?.privacy_mode === 'high';
};
