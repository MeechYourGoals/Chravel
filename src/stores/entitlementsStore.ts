/**
 * Unified Entitlements Store
 * 
 * Single source of truth for user subscription state.
 * Works across demo mode, RevenueCat (iOS/Android), and Stripe (web).
 */

import { create } from 'zustand';
import type { SubscriptionTier, EntitlementId } from '@/billing/types';
import { supabase } from '@/integrations/supabase/client';
import { TIER_ENTITLEMENTS } from '@/billing/entitlements';

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
  
  // Actions
  refreshEntitlements: (userId: string) => Promise<void>;
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
};

export const useEntitlementsStore = create<EntitlementsState>((set, get) => ({
  ...DEFAULT_STATE,
  
  refreshEntitlements: async (userId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Fetch from user_entitlements table
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
