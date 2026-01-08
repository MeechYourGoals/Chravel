/**
 * Unified Entitlements Store
 * 
 * Single source of truth for user subscription state.
 * Works across demo mode, RevenueCat (iOS/Android), and Stripe (web).
 * Super admins always get full access regardless of entitlements table.
 */

import { create } from 'zustand';
import type { SubscriptionTier, EntitlementId } from '@/billing/types';
import { supabase } from '@/integrations/supabase/client';
import { TIER_ENTITLEMENTS } from '@/billing/config';
import { isSuperAdminEmail } from '@/utils/isSuperAdmin';

export type EntitlementSource = 'revenuecat' | 'stripe' | 'admin' | 'demo' | 'none';
export type EntitlementStatus = 'active' | 'trialing' | 'expired' | 'canceled';

interface EntitlementsState {
  // State
  plan: SubscriptionTier;
  status: EntitlementStatus;
  source: EntitlementSource;
  currentPeriodEnd: Date | null;
  entitlements: Set<EntitlementId>;
  isLoading: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
  
  // Computed helpers
  isSubscribed: boolean;
  isPro: boolean;
  isSuperAdmin: boolean;
  
  // Actions
  refreshEntitlements: (userId: string, userEmail?: string) => Promise<void>;
  setSuperAdminMode: () => void;
  setDemoMode: (enabled: boolean) => void;
  setFromStripe: (data: { tier: SubscriptionTier; status: string; periodEnd?: Date }) => void;
  clear: () => void;
}

const DEFAULT_STATE = {
  plan: 'free' as SubscriptionTier,
  status: 'active' as EntitlementStatus,
  source: 'none' as EntitlementSource,
  currentPeriodEnd: null,
  entitlements: new Set<EntitlementId>(),
  isLoading: false,
  lastSyncedAt: null,
  error: null,
  isSubscribed: false,
  isPro: false,
  isSuperAdmin: false,
};

// Super admin gets all entitlements from the highest tier
const SUPER_ADMIN_TIER: SubscriptionTier = 'pro-enterprise';
const getSuperAdminEntitlements = (): Set<EntitlementId> => {
  // Combine all entitlements from all tiers for super admin
  const allEntitlements = new Set<EntitlementId>();
  Object.values(TIER_ENTITLEMENTS).forEach(tierEnts => {
    tierEnts.forEach(ent => allEntitlements.add(ent));
  });
  return allEntitlements;
};

export const useEntitlementsStore = create<EntitlementsState>((set, get) => ({
  ...DEFAULT_STATE,
  
  refreshEntitlements: async (userId: string, userEmail?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // SUPER ADMIN CHECK FIRST - email allowlist is the failsafe
      if (userEmail && isSuperAdminEmail(userEmail)) {
        console.log('[EntitlementsStore] Super admin detected by email:', userEmail);
        set({
          plan: SUPER_ADMIN_TIER,
          status: 'active',
          source: 'admin',
          currentPeriodEnd: null,
          entitlements: getSuperAdminEntitlements(),
          isLoading: false,
          lastSyncedAt: new Date(),
          error: null,
          isSubscribed: true,
          isPro: true,
          isSuperAdmin: true,
        });
        return;
      }

      // Check user_roles for enterprise_admin role (super admin)
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      // Cast to string for comparison since role is an enum
      const roles = rolesData?.map(r => String(r.role)) || [];
      const hasAdminRole = roles.includes('enterprise_admin');

      if (hasAdminRole) {
        console.log('[EntitlementsStore] Super admin detected by role');
        set({
          plan: SUPER_ADMIN_TIER,
          status: 'active',
          source: 'admin',
          currentPeriodEnd: null,
          entitlements: getSuperAdminEntitlements(),
          isLoading: false,
          lastSyncedAt: new Date(),
          error: null,
          isSubscribed: true,
          isPro: true,
          isSuperAdmin: true,
        });
        return;
      }

      // Fetch from user_entitlements table for regular users
      const { data, error } = await supabase
        .from('user_entitlements')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('[EntitlementsStore] Fetch error:', error);
        set({ isLoading: false, error: error.message });
        return;
      }
      
      if (data) {
        const plan = data.plan as SubscriptionTier;
        const status = data.status as EntitlementStatus;
        const tierEntitlements = TIER_ENTITLEMENTS[plan] || [];
        
        set({
          plan,
          status,
          source: data.source as EntitlementSource,
          currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
          entitlements: new Set(tierEntitlements),
          isLoading: false,
          lastSyncedAt: new Date(),
          error: null,
          isSubscribed: status === 'active' || status === 'trialing',
          isPro: plan.startsWith('pro-') || plan === 'frequent-chraveler',
          isSuperAdmin: false,
        });
      } else {
        // No entitlements record - default to free
        set({
          ...DEFAULT_STATE,
          isLoading: false,
          lastSyncedAt: new Date(),
        });
      }
    } catch (err) {
      console.error('[EntitlementsStore] Error:', err);
      set({ isLoading: false, error: 'Failed to load entitlements' });
    }
  },

  setSuperAdminMode: () => {
    set({
      plan: SUPER_ADMIN_TIER,
      status: 'active',
      source: 'admin',
      currentPeriodEnd: null,
      entitlements: getSuperAdminEntitlements(),
      isLoading: false,
      error: null,
      isSubscribed: true,
      isPro: true,
      isSuperAdmin: true,
    });
  },
  
  setDemoMode: (enabled: boolean) => {
    if (enabled) {
      // Demo mode gets full access
      const demoTier: SubscriptionTier = 'frequent-chraveler';
      const tierEntitlements = TIER_ENTITLEMENTS[demoTier] || [];
      
      set({
        plan: demoTier,
        status: 'active',
        source: 'demo',
        currentPeriodEnd: null,
        entitlements: new Set(tierEntitlements),
        isLoading: false,
        error: null,
        isSubscribed: true,
        isPro: true,
      });
    } else {
      // Reset to default when demo mode is disabled
      set(DEFAULT_STATE);
    }
  },
  
  setFromStripe: (data) => {
    const tierEntitlements = TIER_ENTITLEMENTS[data.tier] || [];
    const status = data.status === 'active' || data.status === 'trialing' 
      ? data.status as EntitlementStatus 
      : 'expired';
    
    set({
      plan: data.tier,
      status,
      source: 'stripe',
      currentPeriodEnd: data.periodEnd || null,
      entitlements: new Set(tierEntitlements),
      isLoading: false,
      lastSyncedAt: new Date(),
      error: null,
      isSubscribed: status === 'active' || status === 'trialing',
      isPro: data.tier.startsWith('pro-') || data.tier === 'frequent-chraveler',
    });
  },
  
  clear: () => {
    set(DEFAULT_STATE);
  },
}));
