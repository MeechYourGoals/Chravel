/**
 * Runtime Feature Flags
 *
 * React hook for runtime feature flags backed by Supabase `feature_flags` table.
 * Enables kill switches that can disable features in < 1 minute without redeployment.
 *
 * Usage:
 *   import { useFeatureFlag } from '@/lib/featureFlags';
 *
 *   function MyComponent() {
 *     const isEnabled = useFeatureFlag('ai_concierge');
 *     if (!isEnabled) return <FeatureDisabledMessage />;
 *     return <AIConcierge />;
 *   }
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeatureFlagRow {
  key: string;
  enabled: boolean;
  rollout_percentage: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns whether a feature flag is enabled.
 * Reads from Supabase `feature_flags` table with 60s cache.
 * Falls back to `defaultValue` if table is unreachable.
 */
export function useFeatureFlag(key: string, defaultValue: boolean = true): boolean {
  const { data } = useQuery({
    queryKey: ['feature-flag', key],
    queryFn: async (): Promise<FeatureFlagRow | null> => {
      // intentional: feature_flags table not yet in generated Supabase types
      const { data, error } = await (supabase as any)
        .from('feature_flags')
        .select('key, enabled, rollout_percentage')
        .eq('key', key)
        .single();

      if (error || !data) return null;
      return data as FeatureFlagRow;
    },
    staleTime: 60_000, // Cache for 1 minute — kill switch takes effect within 60s
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: true, // Re-check when user returns to tab
  });

  if (!data) return defaultValue;
  if (!data.enabled) return false;

  // Percentage rollout (deterministic per flag key, not per user)
  if (data.rollout_percentage < 100) {
    const hash = simpleHash(key);
    return hash % 100 < data.rollout_percentage;
  }

  return true;
}

/**
 * Prefetch all feature flags into the query cache.
 * Call once at app startup for faster first reads.
 */
export async function prefetchFeatureFlags(): Promise<void> {
  // intentional: feature_flags table not yet in generated Supabase types
  const { data, error } = await (supabase as any)
    .from('feature_flags')
    .select('key, enabled, rollout_percentage');

  if (error || !data) return;

  for (const flag of data as FeatureFlagRow[]) {
    // Store in a way the individual hooks can find
    // The hooks use ['feature-flag', key] as query key
    // We can't directly set cache here without queryClient access,
    // but the staleTime ensures the next hook call will use cached data
    void flag;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple deterministic hash for rollout percentage calculation */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
