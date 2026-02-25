import { useState, useEffect, useCallback } from 'react';
import { Purchases, type CustomerInfo, type EntitlementInfo } from '@revenuecat/purchases-js';

interface UseRevenueCatSubscriptionReturn {
  /** Whether the user has an active subscription */
  isSubscribed: boolean;
  /** Whether subscription data is loading */
  loading: boolean;
  /** Active entitlements */
  entitlements: Record<string, EntitlementInfo>;
  /** Full customer info from RevenueCat */
  customerInfo: CustomerInfo | null;
  /** Check if user has a specific entitlement */
  hasEntitlement: (entitlementId: string) => boolean;
  /** Refresh subscription status */
  refresh: () => Promise<void>;
  /** Error if any occurred */
  error: string | null;
}

/**
 * Hook to check and manage subscription status using RevenueCat.
 * @param entitlementId - Optional specific entitlement to check (defaults to 'pro')
 */
export const useRevenueCatSubscription = (
  entitlementId = 'pro',
): UseRevenueCatSubscriptionReturn => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomerInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const purchases = Purchases.getSharedInstance();
      const info = await purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch (err) {
      console.error('[useRevenueCatSubscription] Error fetching customer info:', err);
      setError('Failed to check subscription status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomerInfo();
  }, [fetchCustomerInfo]);

  const hasEntitlement = useCallback(
    (id: string): boolean => {
      if (!customerInfo) return false;
      return !!customerInfo.entitlements.active[id];
    },
    [customerInfo],
  );

  const isSubscribed = customerInfo ? !!customerInfo.entitlements.active[entitlementId] : false;

  const entitlements = customerInfo?.entitlements.active || {};

  return {
    isSubscribed,
    loading,
    entitlements,
    customerInfo,
    hasEntitlement,
    refresh: fetchCustomerInfo,
    error,
  };
};
