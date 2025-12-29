/**
 * Unified Entitlements Hook
 * 
 * Single hook for checking feature access across all billing sources.
 * Works with demo mode, RevenueCat (iOS/Android), and Stripe (web).
 */

import { useCallback, useEffect } from 'react';
import { useEntitlementsStore } from '@/stores/entitlementsStore';
import { useDemoMode } from './useDemoMode';
import { useAuth } from './useAuth';
import { getEntitlementsForTier } from '@/billing/entitlements';
import { configureRevenueCat, getCustomerInfo, logoutRevenueCat, isNativePlatform } from '@/integrations/revenuecat/revenuecatClient';
import { REVENUECAT_CONFIG } from '@/constants/revenuecat';
import { supabase } from '@/integrations/supabase/client';
import type { FeatureName, FeatureContext, SubscriptionTier, EntitlementId } from '@/billing/types';

// Feature limits per tier
const FEATURE_LIMITS: Record<FeatureName, Partial<Record<SubscriptionTier, number>>> = {
  ai_concierge: { free: 5, explorer: 10, 'frequent-chraveler': -1 },
  trip_creation: { free: 3, explorer: 10, 'frequent-chraveler': -1 },
  pro_trip_creation: { free: 0, explorer: 0, 'frequent-chraveler': 1 },
  media_upload: { free: 500, explorer: 2000, 'frequent-chraveler': -1 },
  payment_splitting: { free: 3, explorer: 10, 'frequent-chraveler': -1 },
  pdf_export: { free: 0, explorer: -1, 'frequent-chraveler': -1 },
  calendar_sync: { free: 0, explorer: -1, 'frequent-chraveler': -1 },
  event_creation: { free: 0, explorer: 0, 'frequent-chraveler': -1 },
  channels: { free: 0, 'pro-starter': -1 },
  roles: { free: 0, 'pro-starter': -1 },
  roster: { free: 0, 'pro-starter': -1 },
  logistics: { free: 0, 'pro-growth': -1 },
  approvals: { free: 0, 'pro-enterprise': -1 },
  quickbooks: { free: 0, 'pro-enterprise': -1 },
  audit: { free: 0, 'pro-enterprise': -1 },
};

export interface UseUnifiedEntitlementsReturn {
  plan: SubscriptionTier;
  status: 'active' | 'trialing' | 'expired' | 'canceled';
  source: 'revenuecat' | 'stripe' | 'admin' | 'demo' | 'none';
  isLoading: boolean;
  isSubscribed: boolean;
  isPro: boolean;
  canUse: (feature: FeatureName, context?: FeatureContext) => boolean;
  getLimit: (feature: FeatureName) => number;
  hasEntitlement: (entitlement: EntitlementId) => boolean;
  refreshEntitlements: () => Promise<void>;
}

export function useUnifiedEntitlements(): UseUnifiedEntitlementsReturn {
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  const store = useEntitlementsStore();
  
  useEffect(() => {
    const init = async () => {
      if (isDemoMode) {
        store.setDemoMode(true);
        return;
      }
      if (!user?.id) {
        store.clear();
        await logoutRevenueCat();
        return;
      }
      
      if (isNativePlatform() && REVENUECAT_CONFIG.enabled) {
        const rcResult = await configureRevenueCat(user.id);
        if (rcResult.success && rcResult.supported) {
          const customerInfo = await getCustomerInfo();
          if (customerInfo.success && customerInfo.data) {
            await supabase.functions.invoke('sync-revenuecat-entitlement', {
              body: { customerInfo: customerInfo.data, user_id: user.id }
            });
          }
        }
      }
      await store.refreshEntitlements(user.id);
    };
    init();
  }, [isDemoMode, user?.id]);
  
  const refreshEntitlements = useCallback(async () => {
    if (isDemoMode) { store.setDemoMode(true); return; }
    if (!user?.id) { store.clear(); return; }
    await store.refreshEntitlements(user.id);
  }, [isDemoMode, user?.id, store]);
  
  const canUse = useCallback((feature: FeatureName, context?: FeatureContext): boolean => {
    if (isDemoMode) return true;
    const tierEnts = getEntitlementsForTier(store.plan);
    const limits = FEATURE_LIMITS[feature];
    if (!limits) return true;
    const limit = limits[store.plan] ?? limits.free ?? 0;
    if (limit === -1) return true;
    if (limit === 0) return false;
    if (context?.usageCount !== undefined) return context.usageCount < limit;
    return true;
  }, [isDemoMode, store.plan]);
  
  const getLimit = useCallback((feature: FeatureName): number => {
    if (isDemoMode) return -1;
    const limits = FEATURE_LIMITS[feature];
    if (!limits) return -1;
    return limits[store.plan] ?? limits.free ?? -1;
  }, [isDemoMode, store.plan]);
  
  const hasEntitlement = useCallback((entitlement: EntitlementId): boolean => {
    if (isDemoMode) return true;
    return store.entitlements.has(entitlement);
  }, [isDemoMode, store.entitlements]);
  
  return {
    plan: isDemoMode ? 'frequent-chraveler' : store.plan,
    status: isDemoMode ? 'active' : store.status,
    source: isDemoMode ? 'demo' : store.source,
    isLoading: store.isLoading,
    isSubscribed: isDemoMode ? true : store.isSubscribed,
    isPro: isDemoMode ? true : store.isPro,
    canUse,
    getLimit,
    hasEntitlement,
    refreshEntitlements,
  };
}

export function useFeature(feature: FeatureName, context?: FeatureContext) {
  const { canUse, getLimit, isLoading } = useUnifiedEntitlements();
  return { canAccess: canUse(feature, context), limit: getLimit(feature), isLoading };
}

export function useProTier() {
  const { plan, isPro, isLoading, canUse } = useUnifiedEntitlements();
  return { isPro, plan, canCreateProTrip: canUse('pro_trip_creation'), canCreateEvent: canUse('event_creation'), isLoading };
}
