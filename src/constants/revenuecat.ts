/**
 * RevenueCat Configuration
 * 
 * Maps RevenueCat entitlements to Chravel subscription tiers.
 * Ensures parity with Stripe pricing/naming.
 */

import type { SubscriptionTier } from '@/billing/types';

// RevenueCat feature flag
export const REVENUECAT_ENABLED = import.meta.env.VITE_REVENUECAT_ENABLED === 'true';

// Platform-specific API keys (set via env vars, never committed)
export const REVENUECAT_IOS_API_KEY = import.meta.env.VITE_REVENUECAT_IOS_API_KEY || '';
export const REVENUECAT_ANDROID_API_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY || '';

/**
 * RevenueCat entitlement IDs - MUST match RevenueCat dashboard
 * These map to our Stripe product names for consistency
 */
export const REVENUECAT_ENTITLEMENTS = {
  // Consumer tiers (match Stripe CONSUMER_PLANS)
  explorer: import.meta.env.VITE_REVENUECAT_EXPLORER_ENTITLEMENT_ID || 'chravel_explorer',
  frequentChraveler: import.meta.env.VITE_REVENUECAT_FREQUENT_CHRAVELER_ENTITLEMENT_ID || 'chravel_frequent_chraveler',
  
  // Pro tiers (for future use)
  proStarter: 'chravel_pro_starter',
  proGrowth: 'chravel_pro_growth',
  proEnterprise: 'chravel_pro_enterprise',
} as const;

/**
 * Product IDs for RevenueCat offerings
 * These should match the product identifiers in App Store Connect / Google Play Console
 */
export const REVENUECAT_PRODUCTS = {
  // Explorer tier - $4.99/month, $39.99/year (matches Stripe)
  explorerMonthly: 'chravel_explorer_monthly',
  explorerAnnual: 'chravel_explorer_annual',
  
  // Frequent Chraveler tier - $9.99/month, $79.99/year (matches Stripe)
  frequentChravelerMonthly: 'chravel_frequent_chraveler_monthly',
  frequentChravelerAnnual: 'chravel_frequent_chraveler_annual',
} as const;

/**
 * Maps RevenueCat entitlement IDs to our internal subscription tiers
 */
export const ENTITLEMENT_TO_TIER: Record<string, SubscriptionTier> = {
  [REVENUECAT_ENTITLEMENTS.explorer]: 'explorer',
  [REVENUECAT_ENTITLEMENTS.frequentChraveler]: 'frequent-chraveler',
  [REVENUECAT_ENTITLEMENTS.proStarter]: 'pro-starter',
  [REVENUECAT_ENTITLEMENTS.proGrowth]: 'pro-growth',
  [REVENUECAT_ENTITLEMENTS.proEnterprise]: 'pro-enterprise',
};

/**
 * Maps our internal tiers to RevenueCat entitlement IDs
 */
export const TIER_TO_ENTITLEMENT: Partial<Record<SubscriptionTier, string>> = {
  'explorer': REVENUECAT_ENTITLEMENTS.explorer,
  'frequent-chraveler': REVENUECAT_ENTITLEMENTS.frequentChraveler,
  'pro-starter': REVENUECAT_ENTITLEMENTS.proStarter,
  'pro-growth': REVENUECAT_ENTITLEMENTS.proGrowth,
  'pro-enterprise': REVENUECAT_ENTITLEMENTS.proEnterprise,
};

/**
 * Pricing display (for UI - matches Stripe pricing)
 */
export const REVENUECAT_PRICING = {
  explorer: {
    monthly: 4.99,
    annual: 39.99,
    currency: 'USD',
  },
  frequentChraveler: {
    monthly: 9.99,
    annual: 79.99,
    currency: 'USD',
  },
} as const;

/**
 * Get the appropriate API key for the current platform
 */
export function getRevenueCatApiKey(platform: 'ios' | 'android' | 'web'): string | null {
  if (platform === 'ios') {
    return REVENUECAT_IOS_API_KEY || null;
  }
  if (platform === 'android') {
    return REVENUECAT_ANDROID_API_KEY || null;
  }
  // Web doesn't use RevenueCat
  return null;
}

/**
 * Check if RevenueCat is properly configured for the given platform
 */
export function isRevenueCatConfigured(platform: 'ios' | 'android' | 'web'): boolean {
  if (!REVENUECAT_ENABLED) return false;
  if (platform === 'web') return false;
  
  const apiKey = getRevenueCatApiKey(platform);
  return !!apiKey && apiKey.length > 0;
}
