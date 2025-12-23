/**
 * useEntitlements Hook
 * 
 * Lightweight hook for checking feature access without full billing state.
 * Use this in components that only need to check if a feature is available.
 */

import { useMemo } from 'react';
import { useBilling } from './useBilling';
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
  
  /**
   * Check if user has a specific entitlement
   */
  const hasEntitlement = useMemo(() => {
    return (entitlement: EntitlementId): boolean => {
      if (!entitlements) return false;
      return entitlements.entitlements.has(entitlement);
    };
  }, [entitlements]);
  
  return {
    canUse: canUseFeature,
    hasEntitlement,
    getLimit,
    isLoading,
    tier,
    isSubscribed,
  };
}

/**
 * Hook for checking a single feature
 * Useful for simple gating scenarios
 */
export function useFeatureAccess(feature: FeatureName, context?: FeatureContext): {
  canAccess: boolean;
  limit: number;
  isLoading: boolean;
} {
  const { canUseFeature, getLimit, isLoading } = useBilling();
  
  const canAccess = useMemo(() => {
    return canUseFeature(feature, context);
  }, [canUseFeature, feature, context]);
  
  const limit = useMemo(() => {
    return getLimit(feature);
  }, [getLimit, feature]);
  
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
  
  const isPro = useMemo(() => {
    return tier.startsWith('pro-') || tier === 'frequent-chraveler';
  }, [tier]);
  
  const canCreateProTrip = useMemo(() => {
    return canUseFeature('pro_trip_creation');
  }, [canUseFeature]);
  
  return {
    isPro,
    canCreateProTrip,
    isLoading,
  };
}
