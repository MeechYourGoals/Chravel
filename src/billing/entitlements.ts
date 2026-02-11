/**
 * Entitlements Engine
 *
 * Core functions for checking user entitlements and feature access.
 * Platform-agnostic - works the same on web, iOS, and Android.
 */

import { supabase } from '@/integrations/supabase/client';
import { SUPER_ADMIN_EMAILS } from '@/constants/admins';
import { BILLING_PRODUCTS, FREE_ENTITLEMENTS, getTierFromStripeProductId } from './config';
import type {
  EntitlementId,
  UserEntitlements,
  SubscriptionTier,
  FeatureName,
  FeatureContext,
  BillingSource,
} from './types';

/**
 * Get entitlements for a user
 *
 * Checks Supabase profile for subscription data, then maps to entitlements.
 * In the future, this will also check Apple/Google receipts for native purchases.
 */
export async function getEntitlements(userId: string): Promise<UserEntitlements> {
  try {
    // Get user email for super admin check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = user?.email?.toLowerCase();

    // Super admins get all entitlements
    if (email && SUPER_ADMIN_EMAILS.includes(email)) {
      return createSuperAdminEntitlements();
    }

    // Check subscription via Edge Function
    const { data, error } = await supabase.functions.invoke('check-subscription');

    if (error) {
      console.error('[Entitlements] Error checking subscription:', error);
      return createFreeEntitlements();
    }

    const { subscribed, product_id, tier, subscription_end, stripe_customer_id } = data;

    if (!subscribed) {
      return createFreeEntitlements();
    }

    // Determine tier from response or product_id
    let userTier: SubscriptionTier = 'free';
    if (tier) {
      userTier = tier as SubscriptionTier;
    } else if (product_id) {
      userTier = getTierFromStripeProductId(product_id);
    }

    // Get entitlements for this tier
    const entitlements = getEntitlementsForTier(userTier);

    return {
      entitlements: new Set(entitlements),
      tier: userTier,
      source: 'stripe' as BillingSource,
      expiresAt: subscription_end ? new Date(subscription_end) : undefined,
      stripeCustomerId: stripe_customer_id,
    };
  } catch (error) {
    console.error('[Entitlements] Unexpected error:', error);
    return createFreeEntitlements();
  }
}

/**
 * Check if user can use a specific feature
 */
export function canUseFeature(
  feature: FeatureName,
  entitlements: UserEntitlements | null,
  context?: FeatureContext,
): boolean {
  if (!entitlements) {
    return canUseFreeFeature(feature, context);
  }

  const requiredEntitlements = FEATURE_TO_ENTITLEMENTS[feature];
  if (!requiredEntitlements || requiredEntitlements.length === 0) {
    return true; // Feature doesn't require any entitlements
  }

  // Check if user has ANY of the required entitlements
  return requiredEntitlements.some(ent => entitlements.entitlements.has(ent));
}

/**
 * Get the usage limit for a feature
 * Returns -1 for unlimited, otherwise the limit number
 */
export function getFeatureLimit(
  feature: FeatureName,
  entitlements: UserEntitlements | null,
): number {
  const limits = FEATURE_LIMITS[feature];
  if (!limits) return -1; // No limits defined = unlimited

  const tier = entitlements?.tier || 'free';
  return limits[tier] ?? limits.free ?? -1;
}

/**
 * Check if a free user can use a feature (with limits)
 */
function canUseFreeFeature(feature: FeatureName, context?: FeatureContext): boolean {
  const freeLimit = FEATURE_LIMITS[feature]?.free;

  // No limit defined = not available to free users
  if (freeLimit === undefined || freeLimit === 0) {
    return false;
  }

  // Unlimited for free
  if (freeLimit === -1) {
    return true;
  }

  // Check usage context
  if (context?.usageCount !== undefined) {
    return context.usageCount < freeLimit;
  }

  return true;
}

/**
 * Get entitlements array for a tier
 */
export function getEntitlementsForTier(tier: SubscriptionTier): EntitlementId[] {
  if (tier === 'free') {
    return [...FREE_ENTITLEMENTS];
  }

  // Find the product for this tier
  for (const [key, product] of Object.entries(BILLING_PRODUCTS)) {
    const tierKeys = Object.entries({
      explorer: 'consumer-explorer',
      'frequent-chraveler': 'consumer-frequent-chraveler',
      'pro-starter': 'pro-starter',
      'pro-growth': 'pro-growth',
      'pro-enterprise': 'pro-enterprise',
    });

    const match = tierKeys.find(([t, pk]) => t === tier && pk === key);
    if (match) {
      return [...product.entitlements];
    }
  }

  return [...FREE_ENTITLEMENTS];
}

/**
 * Create entitlements for free tier
 */
function createFreeEntitlements(): UserEntitlements {
  return {
    entitlements: new Set(FREE_ENTITLEMENTS),
    tier: 'free',
    source: 'none',
  };
}

/**
 * Create entitlements for super admins (all features unlocked)
 */
function createSuperAdminEntitlements(): UserEntitlements {
  const allEntitlements: EntitlementId[] = [
    'ai_queries_unlimited',
    'trips_unlimited',
    'storage_unlimited',
    'payments_unlimited',
    'pdf_export',
    'calendar_sync',
    'voice_concierge',
    'pro_trip_creation',
    'events_create',
    'events_attendees_unlimited',
    'channels_enabled',
    'roles_enabled',
    'roster_management',
    'logistics_management',
    'approval_workflows',
    'quickbooks_integration',
    'compliance_audit',
  ];

  return {
    entitlements: new Set(allEntitlements),
    tier: 'pro-enterprise',
    source: 'none', // Admin bypass, not a real subscription
  };
}

/**
 * Mapping of features to required entitlements
 * User needs at least ONE of the listed entitlements
 */
const FEATURE_TO_ENTITLEMENTS: Record<FeatureName, EntitlementId[]> = {
  ai_concierge: ['ai_queries_basic', 'ai_queries_extended', 'ai_queries_unlimited'],
  trip_creation: ['trips_basic', 'trips_extended', 'trips_unlimited'],
  pro_trip_creation: ['pro_trip_creation'],
  media_upload: ['storage_basic', 'storage_extended', 'storage_unlimited'],
  payment_splitting: ['payments_basic', 'payments_extended', 'payments_unlimited'],
  pdf_export: ['pdf_export'],
  calendar_sync: ['calendar_sync'],
  event_creation: ['events_create'],
  channels: ['channels_enabled'],
  roles: ['roles_enabled'],
  roster: ['roster_management'],
  logistics: ['logistics_management'],
  approvals: ['approval_workflows'],
  quickbooks: ['quickbooks_integration'],
  audit: ['compliance_audit'],
  voice_concierge: ['voice_concierge'],
};

/**
 * Usage limits per feature per tier
 * -1 = unlimited, 0 = not available, positive number = limit
 */
const FEATURE_LIMITS: Record<FeatureName, Partial<Record<SubscriptionTier, number>>> = {
  ai_concierge: {
    free: 5,
    explorer: 10,
    'frequent-chraveler': -1,
    'pro-starter': -1,
    'pro-growth': -1,
    'pro-enterprise': -1,
  },
  trip_creation: {
    free: 3,
    explorer: 10,
    'frequent-chraveler': -1,
    'pro-starter': -1,
    'pro-growth': -1,
    'pro-enterprise': -1,
  },
  pro_trip_creation: {
    free: 0,
    explorer: 0,
    'frequent-chraveler': 1,
    'pro-starter': -1,
    'pro-growth': -1,
    'pro-enterprise': -1,
  },
  media_upload: {
    free: 500, // MB
    explorer: 2000,
    'frequent-chraveler': -1,
    'pro-starter': -1,
    'pro-growth': -1,
    'pro-enterprise': -1,
  },
  payment_splitting: {
    free: 3,
    explorer: 10,
    'frequent-chraveler': -1,
    'pro-starter': -1,
    'pro-growth': -1,
    'pro-enterprise': -1,
  },
  pdf_export: {
    free: 0,
    explorer: -1,
    'frequent-chraveler': -1,
    'pro-starter': -1,
    'pro-growth': -1,
    'pro-enterprise': -1,
  },
  calendar_sync: {
    free: 0,
    explorer: -1,
    'frequent-chraveler': -1,
    'pro-starter': -1,
    'pro-growth': -1,
    'pro-enterprise': -1,
  },
  event_creation: {
    free: 0,
    explorer: 0,
    'frequent-chraveler': -1,
    'pro-starter': -1,
    'pro-growth': -1,
    'pro-enterprise': -1,
  },
  channels: {
    free: 0,
    explorer: 0,
    'frequent-chraveler': 0,
    'pro-starter': -1,
    'pro-growth': -1,
    'pro-enterprise': -1,
  },
  roles: {
    free: 0,
    explorer: 0,
    'frequent-chraveler': 0,
    'pro-starter': -1,
    'pro-growth': -1,
    'pro-enterprise': -1,
  },
  roster: {
    free: 0,
    explorer: 0,
    'frequent-chraveler': 0,
    'pro-starter': -1,
    'pro-growth': -1,
    'pro-enterprise': -1,
  },
  logistics: {
    free: 0,
    explorer: 0,
    'frequent-chraveler': 0,
    'pro-starter': 0,
    'pro-growth': -1,
    'pro-enterprise': -1,
  },
  approvals: {
    free: 0,
    explorer: 0,
    'frequent-chraveler': 0,
    'pro-starter': 0,
    'pro-growth': 0,
    'pro-enterprise': -1,
  },
  quickbooks: {
    free: 0,
    explorer: 0,
    'frequent-chraveler': 0,
    'pro-starter': 0,
    'pro-growth': 0,
    'pro-enterprise': -1,
  },
  audit: {
    free: 0,
    explorer: 0,
    'frequent-chraveler': 0,
    'pro-starter': 0,
    'pro-growth': 0,
    'pro-enterprise': -1,
  },
  voice_concierge: {
    free: 0,
    explorer: 0,
    'frequent-chraveler': -1,
    'pro-starter': -1,
    'pro-growth': -1,
    'pro-enterprise': -1,
  },
};
