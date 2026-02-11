/**
 * Unified Entitlements Hook
 *
 * Single hook for checking feature access across all billing sources.
 * Works with demo mode, RevenueCat (iOS/Android), Stripe (web), and super admin override.
 */

import { useCallback, useEffect } from 'react';
import { useEntitlementsStore } from '@/stores/entitlementsStore';
import { useDemoMode } from './useDemoMode';
import { useAuth } from './useAuth';
import { getEntitlementsForTier } from '@/billing/entitlements';
import {
  configureRevenueCat,
  getCustomerInfo,
  logoutRevenueCat,
  isNativePlatform,
} from '@/integrations/revenuecat/revenuecatClient';
import { REVENUECAT_CONFIG } from '@/constants/revenuecat';
import { supabase } from '@/integrations/supabase/client';
import { isSuperAdminEmail } from '@/utils/isSuperAdmin';
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
  voice_concierge: {
    free: 0,
    explorer: 0,
    'frequent-chraveler': -1,
    'pro-starter': -1,
    'pro-growth': -1,
    'pro-enterprise': -1,
  },
};

export interface UseUnifiedEntitlementsReturn {
  plan: SubscriptionTier;
  status: 'active' | 'trialing' | 'expired' | 'canceled';
  source: 'revenuecat' | 'stripe' | 'admin' | 'demo' | 'none';
  isLoading: boolean;
  isSubscribed: boolean;
  isPro: boolean;
  isSuperAdmin: boolean;
  canUse: (feature: FeatureName, context?: FeatureContext) => boolean;
  getLimit: (feature: FeatureName) => number;
  hasEntitlement: (entitlement: EntitlementId) => boolean;
  refreshEntitlements: () => Promise<void>;
}

export function useUnifiedEntitlements(): UseUnifiedEntitlementsReturn {
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  const store = useEntitlementsStore();

  // Check super admin by email (founder failsafe)
  const isSuperAdminByEmail = isSuperAdminEmail(user?.email);

  useEffect(() => {
    const init = async () => {
      // Super admin by email takes highest priority
      if (isSuperAdminByEmail) {
        store.setSuperAdminMode();
        return;
      }

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
              body: { customerInfo: customerInfo.data, user_id: user.id },
            });
          }
        }
      }
      // Pass email for super admin check inside refreshEntitlements
      await store.refreshEntitlements(user.id, user.email);
    };
    init();
  }, [isDemoMode, user?.id, user?.email, isSuperAdminByEmail]);

  const refreshEntitlements = useCallback(async () => {
    if (isSuperAdminByEmail) {
      store.setSuperAdminMode();
      return;
    }
    if (isDemoMode) {
      store.setDemoMode(true);
      return;
    }
    if (!user?.id) {
      store.clear();
      return;
    }
    await store.refreshEntitlements(user.id, user.email);
  }, [isDemoMode, user?.id, user?.email, isSuperAdminByEmail, store]);

  // Super admins and demo mode get unlimited access to everything
  const hasUnlimitedAccess = isSuperAdminByEmail || isDemoMode || store.isSuperAdmin;

  const canUse = useCallback(
    (feature: FeatureName, context?: FeatureContext): boolean => {
      if (hasUnlimitedAccess) return true;
      const tierEnts = getEntitlementsForTier(store.plan);
      const limits = FEATURE_LIMITS[feature];
      if (!limits) return true;
      const limit = limits[store.plan] ?? limits.free ?? 0;
      if (limit === -1) return true;
      if (limit === 0) return false;
      if (context?.usageCount !== undefined) return context.usageCount < limit;
      return true;
    },
    [hasUnlimitedAccess, store.plan],
  );

  const getLimit = useCallback(
    (feature: FeatureName): number => {
      if (hasUnlimitedAccess) return -1;
      const limits = FEATURE_LIMITS[feature];
      if (!limits) return -1;
      return limits[store.plan] ?? limits.free ?? -1;
    },
    [hasUnlimitedAccess, store.plan],
  );

  const hasEntitlement = useCallback(
    (entitlement: EntitlementId): boolean => {
      if (hasUnlimitedAccess) return true;
      return store.entitlements.has(entitlement);
    },
    [hasUnlimitedAccess, store.entitlements],
  );

  return {
    plan: hasUnlimitedAccess ? 'pro-enterprise' : store.plan,
    status: hasUnlimitedAccess ? 'active' : store.status,
    source: isSuperAdminByEmail ? 'admin' : isDemoMode ? 'demo' : store.source,
    isLoading: store.isLoading,
    isSubscribed: hasUnlimitedAccess ? true : store.isSubscribed,
    isPro: hasUnlimitedAccess ? true : store.isPro,
    isSuperAdmin: isSuperAdminByEmail || store.isSuperAdmin,
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
  return {
    isPro,
    plan,
    canCreateProTrip: canUse('pro_trip_creation'),
    canCreateEvent: canUse('event_creation'),
    isLoading,
  };
}
