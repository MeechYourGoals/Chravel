/**
 * useBilling Hook
 *
 * Main billing hook that provides unified access to billing state and actions.
 * Drop-in replacement for useConsumerSubscription with platform awareness.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getEntitlements, canUseFeature as checkFeature, getFeatureLimit } from '../entitlements';
import {
  getBillingProvider,
  getPlatform,
  canUseWebCheckout,
  requiresIAPForTier,
} from '../providers';
import { BILLING_FLAGS } from '../config';
import type {
  UserEntitlements,
  SubscriptionTier,
  FeatureName,
  FeatureContext,
  PurchaseRequest,
  PurchaseResult,
  BillingPlatform,
} from '../types';

export interface UseBillingReturn {
  // State
  entitlements: UserEntitlements | null;
  isLoading: boolean;
  error: string | null;
  platform: BillingPlatform;

  // Computed values
  tier: SubscriptionTier;
  isSubscribed: boolean;
  isPlus: boolean; // Legacy compatibility
  canCreateProTrip: boolean;
  proTripQuota: number;

  // Feature checking
  canUseFeature: (feature: FeatureName, context?: FeatureContext) => boolean;
  getLimit: (feature: FeatureName) => number;

  // Actions
  purchase: (request: PurchaseRequest) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<void>;
  openManagement: () => Promise<void>;
  refreshEntitlements: () => Promise<void>;

  // Platform-specific helpers
  requiresIAP: (tier: SubscriptionTier) => boolean;
  canUseWebCheckout: (tier?: SubscriptionTier) => boolean;
  showWebSubscribePrompt: boolean;
}

/**
 * Main billing hook
 */
export function useBilling(): UseBillingReturn {
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const platform = getPlatform();

  // Load entitlements on mount and user change
  useEffect(() => {
    if (user) {
      loadEntitlements();
    } else {
      setEntitlements(null);
      setIsLoading(false);
    }
  }, [user?.id]);

  // Auto-refresh entitlements periodically (every 60 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      loadEntitlements();
    }, 60000);

    return () => clearInterval(interval);
  }, [user?.id]);

  /**
   * Load entitlements from backend
   */
  const loadEntitlements = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const ents = await getEntitlements(user.id);
      setEntitlements(ents);
    } catch (err) {
      console.error('[useBilling] Failed to load entitlements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Check if user can use a feature
   */
  const canUseFeature = useCallback(
    (feature: FeatureName, context?: FeatureContext): boolean => {
      return checkFeature(feature, entitlements, context);
    },
    [entitlements],
  );

  /**
   * Get limit for a feature
   */
  const getLimit = useCallback(
    (feature: FeatureName): number => {
      return getFeatureLimit(feature, entitlements);
    },
    [entitlements],
  );

  /**
   * Purchase a subscription
   */
  const purchase = useCallback(
    async (request: PurchaseRequest): Promise<PurchaseResult> => {
      const provider = getBillingProvider(request.tier);
      const result = await provider.purchase(request);

      // If successful, refresh entitlements
      if (result.success) {
        await loadEntitlements();
      }

      return result;
    },
    [loadEntitlements],
  );

  /**
   * Restore purchases (mainly for IAP)
   */
  const restorePurchases = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      const provider = getBillingProvider();
      const restored = await provider.restorePurchases();

      if (restored) {
        setEntitlements(restored);
      } else {
        // If native restore returns null, try fetching from backend
        await loadEntitlements();
      }
    } catch (err) {
      console.error('[useBilling] Failed to restore purchases:', err);
      setError(err instanceof Error ? err.message : 'Failed to restore purchases');
    } finally {
      setIsLoading(false);
    }
  }, [loadEntitlements]);

  /**
   * Open subscription management
   */
  const openManagement = useCallback(async (): Promise<void> => {
    try {
      const provider = getBillingProvider();
      await provider.openManagement();
    } catch (err) {
      console.error('[useBilling] Failed to open management:', err);
      throw err;
    }
  }, []);

  /**
   * Manually refresh entitlements
   */
  const refreshEntitlements = useCallback(async (): Promise<void> => {
    await loadEntitlements();
  }, [loadEntitlements]);

  // Computed values
  const tier = entitlements?.tier ?? 'free';
  const isSubscribed = tier !== 'free';
  const isPlus = isSubscribed; // Legacy compatibility
  const canCreateProTrip = canUseFeature('pro_trip_creation');
  const proTripQuota = getLimit('pro_trip_creation');

  // Show web subscribe prompt on iOS when IAP is not enabled
  const showWebSubscribePrompt =
    platform === 'ios' &&
    BILLING_FLAGS.SHOW_WEB_SUBSCRIBE_PROMPT &&
    !BILLING_FLAGS.APPLE_IAP_ENABLED;

  return {
    // State
    entitlements,
    isLoading,
    error,
    platform,

    // Computed values
    tier,
    isSubscribed,
    isPlus,
    canCreateProTrip,
    proTripQuota,

    // Feature checking
    canUseFeature,
    getLimit,

    // Actions
    purchase,
    restorePurchases,
    openManagement,
    refreshEntitlements,

    // Platform-specific helpers
    requiresIAP: requiresIAPForTier,
    canUseWebCheckout,
    showWebSubscribePrompt,
  };
}
