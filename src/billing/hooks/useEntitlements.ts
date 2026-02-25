/**
 * useEntitlements Hook
 *
 * Lightweight hook for checking feature access without full billing state.
 * Use this in components that only need to check if a feature is available.
 *
 * NOTE: This is maintained for backward compatibility.
 * New code should use useUnifiedEntitlements from @/hooks/useUnifiedEntitlements
 */

import { useMemo } from 'react';
import { useBilling } from './useBilling';
import { useEntitlementsStore } from '@/stores/entitlementsStore';
import { useDemoMode } from '@/hooks/useDemoMode';
import type { FeatureName, FeatureContext, EntitlementId } from '../types';

export interface UseEntitlementsReturn {
  // Quick checks
  canUse: (feature: FeatureName, context?: FeatureContext) => boolean;
  hasEntitlement: (entitlement: EntitlementId) => boolean;
  getLimit: (feature: FeatureName) => number;

  // State
  isLoading: boolean;
  tier: string;
  isSubscribed: boolean;
}

/**
 * Lightweight entitlements hook
 */
export function useEntitlements(): UseEntitlementsReturn {
  const { entitlements, isLoading, tier, isSubscribed, canUseFeature, getLimit } = useBilling();
  const store = useEntitlementsStore();
  const { isDemoMode } = useDemoMode();

  /**
   * Check if user has a specific entitlement
   */
  const hasEntitlement = useMemo(() => {
    return (entitlement: EntitlementId): boolean => {
      if (isDemoMode) return true;
      if (store.entitlements.size > 0) {
        return store.entitlements.has(entitlement);
      }
      if (!entitlements) return false;
      return entitlements.entitlements.has(entitlement);
    };
  }, [entitlements, store.entitlements, isDemoMode]);

  // Use unified store if it has data, otherwise fall back to billing hook
  const effectiveTier = store.plan !== 'free' || store.source !== 'none' ? store.plan : tier;

  const effectiveIsSubscribed = store.source !== 'none' ? store.isSubscribed : isSubscribed;

  return {
    canUse: canUseFeature,
    hasEntitlement,
    getLimit,
    isLoading: isLoading || store.isLoading,
    tier: isDemoMode ? 'frequent-chraveler' : effectiveTier,
    isSubscribed: isDemoMode ? true : effectiveIsSubscribed,
  };
}

/**
 * Hook for checking a single feature
 * Useful for simple gating scenarios
 */
export function useFeatureAccess(
  feature: FeatureName,
  context?: FeatureContext,
): {
  canAccess: boolean;
  limit: number;
  isLoading: boolean;
} {
  const { canUseFeature, getLimit, isLoading } = useBilling();
  const { isDemoMode } = useDemoMode();

  const canAccess = useMemo(() => {
    if (isDemoMode) return true;
    return canUseFeature(feature, context);
  }, [canUseFeature, feature, context, isDemoMode]);

  const limit = useMemo(() => {
    if (isDemoMode) return -1;
    return getLimit(feature);
  }, [getLimit, feature, isDemoMode]);

  return {
    canAccess,
    limit,
    isLoading,
  };
}

/**
 * Hook for Pro feature gating
 * Returns whether user has access to Pro features
 */
export function useProAccess(): {
  isPro: boolean;
  canCreateProTrip: boolean;
  isLoading: boolean;
} {
  const { tier, canUseFeature, isLoading } = useBilling();
  const store = useEntitlementsStore();
  const { isDemoMode } = useDemoMode();

  const isPro = useMemo(() => {
    if (isDemoMode) return true;
    if (store.isPro) return true;
    return tier.startsWith('pro-') || tier === 'frequent-chraveler';
  }, [tier, store.isPro, isDemoMode]);

  const canCreateProTrip = useMemo(() => {
    if (isDemoMode) return true;
    return canUseFeature('pro_trip_creation');
  }, [canUseFeature, isDemoMode]);

  return {
    isPro,
    canCreateProTrip,
    isLoading,
  };
}
