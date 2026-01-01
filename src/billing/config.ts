/**
 * Billing Configuration
 *
 * Single source of truth for product IDs, entitlements, and feature flags.
 *
 * APPLE APP STORE COMPLIANCE:
 * - Consumer subscriptions (digital goods) MUST use IAP on iOS
 * - B2B/Enterprise (Pro plans) CAN use external payment (Reader Rule exception)
 * - Trip payments for real-world services are NOT subject to IAP
 */

import type { EntitlementId, SubscriptionTier } from './types';

/**
 * Product configuration for each subscription tier
 */
export interface ProductConfig {
  name: string;
  stripeProductId: string;
  stripePriceIdMonthly: string;
  stripePriceIdAnnual?: string;
  appleProductIdMonthly?: string;
  appleProductIdAnnual?: string;
  googleProductIdMonthly?: string;
  googleProductIdAnnual?: string;
  requiresIAPOnIOS: boolean;
  entitlements: EntitlementId[];
  priceMonthly: number;
  priceAnnual?: number;
}

/**
 * All billing products
 */
export const BILLING_PRODUCTS: Record<string, ProductConfig> = {
  // ============================================
  // CONSUMER PLANS - MUST use IAP on iOS
  // ============================================

  'consumer-explorer': {
    name: 'Explorer',
    stripeProductId: 'prod_Tc0SWNhLkoCDIi',
    stripePriceIdMonthly: 'price_1RXJvGAedhHV8iZ8ZiZdMQGP',
    stripePriceIdAnnual: 'price_1RXJvGAedhHV8iZ8wILOZyb0',
    appleProductIdMonthly: 'com.chravel.explorer.monthly', // TODO: Create in App Store Connect
    appleProductIdAnnual: 'com.chravel.explorer.annual',
    googleProductIdMonthly: 'com.chravel.explorer.monthly',
    googleProductIdAnnual: 'com.chravel.explorer.annual',
    requiresIAPOnIOS: true,
    priceMonthly: 9.99,
    priceAnnual: 99,
    entitlements: [
      'ai_queries_extended',
      'trips_extended',
      'storage_extended',
      'payments_extended',
      'pdf_export',
      'calendar_sync',
    ],
  },

  'consumer-frequent-chraveler': {
    name: 'Frequent Chraveler',
    stripeProductId: 'prod_Tc0WEzRDTCkfPM',
    stripePriceIdMonthly: 'price_1RXJzNAedhHV8iZ8Hpu8ajwX',
    stripePriceIdAnnual: 'price_1RXJzNAedhHV8iZ8tKLQSBMX',
    appleProductIdMonthly: 'com.chravel.frequentchraveler.monthly',
    appleProductIdAnnual: 'com.chravel.frequentchraveler.annual',
    googleProductIdMonthly: 'com.chravel.frequentchraveler.monthly',
    googleProductIdAnnual: 'com.chravel.frequentchraveler.annual',
    requiresIAPOnIOS: true,
    priceMonthly: 19.99,
    priceAnnual: 199,
    entitlements: [
      'ai_queries_unlimited',
      'trips_unlimited',
      'storage_unlimited',
      'payments_unlimited',
      'pdf_export',
      'calendar_sync',
      'pro_trip_creation',
      'events_create',
      'events_attendees_100',
    ],
  },

  // Legacy Plus tier (maps to Explorer)
  'consumer-plus': {
    name: 'Plus (Legacy)',
    stripeProductId: 'prod_SffF8X29utfVPM',
    stripePriceIdMonthly: 'price_1QMTQ6AedhHV8iZ8Y2WGYlQJ',
    requiresIAPOnIOS: true,
    priceMonthly: 4.99,
    entitlements: [
      'ai_queries_extended',
      'trips_extended',
      'storage_extended',
      'payments_extended',
    ],
  },

  // ============================================
  // PRO PLANS - CAN use web checkout (B2B exception)
  // ============================================

  'pro-starter': {
    name: 'Starter Pro',
    stripeProductId: 'prod_Tc0YVR1N0fmtDG',
    stripePriceIdMonthly: 'price_1RXK1sAedhHV8iZ8S74oKAqG',
    stripePriceIdAnnual: 'price_1RXK1sAedhHV8iZ80l3YE1kv',
    requiresIAPOnIOS: false, // B2B exception
    priceMonthly: 49,
    priceAnnual: 490,
    entitlements: [
      'ai_queries_unlimited',
      'trips_unlimited',
      'storage_unlimited',
      'payments_unlimited',
      'pdf_export',
      'calendar_sync',
      'pro_trip_creation',
      'channels_enabled',
      'roles_enabled',
      'roster_management',
    ],
  },

  'pro-growth': {
    name: 'Growth Pro',
    stripeProductId: 'prod_Tc0afc0pIUt87D',
    stripePriceIdMonthly: 'price_1RXK3dAedhHV8iZ8dn9vGqWN',
    stripePriceIdAnnual: 'price_1RXK3dAedhHV8iZ8S7m10o6j',
    requiresIAPOnIOS: false,
    priceMonthly: 99,
    priceAnnual: 990,
    entitlements: [
      'ai_queries_unlimited',
      'trips_unlimited',
      'storage_unlimited',
      'payments_unlimited',
      'pdf_export',
      'calendar_sync',
      'pro_trip_creation',
      'channels_enabled',
      'roles_enabled',
      'roster_management',
      'logistics_management',
      'events_create',
      'events_attendees_200',
    ],
  },

  'pro-enterprise': {
    name: 'Pro Enterprise',
    stripeProductId: 'prod_Tc0cJshKNpvxV0',
    stripePriceIdMonthly: 'price_1RXK58AedhHV8iZ8GJHNqvld',
    stripePriceIdAnnual: 'price_1RXK58AedhHV8iZ8mcfvfYUy',
    requiresIAPOnIOS: false,
    priceMonthly: 199,
    priceAnnual: 1990,
    entitlements: [
      'ai_queries_unlimited',
      'trips_unlimited',
      'storage_unlimited',
      'payments_unlimited',
      'pdf_export',
      'calendar_sync',
      'pro_trip_creation',
      'channels_enabled',
      'roles_enabled',
      'roster_management',
      'logistics_management',
      'events_create',
      'events_attendees_unlimited',
      'approval_workflows',
      'quickbooks_integration',
      'compliance_audit',
    ],
  },
};

/**
 * Map tier names to product keys
 */
export const TIER_TO_PRODUCT: Record<SubscriptionTier, string | null> = {
  free: null,
  explorer: 'consumer-explorer',
  'frequent-chraveler': 'consumer-frequent-chraveler',
  'pro-starter': 'pro-starter',
  'pro-growth': 'pro-growth',
  'pro-enterprise': 'pro-enterprise',
};

/**
 * Free tier entitlements
 */
export const FREE_ENTITLEMENTS: EntitlementId[] = [
  'ai_queries_basic',
  'trips_basic',
  'storage_basic',
  'payments_basic',
];

/**
 * Feature flags for platform-specific billing behavior
 */
export const BILLING_FLAGS = {
  /**
   * Set to true when Apple IAP is fully implemented.
   * When false, iOS users will see "Subscribe on web" prompt.
   */
  APPLE_IAP_ENABLED: false,

  /**
   * Set to true when Google Play Billing is implemented.
   */
  GOOGLE_BILLING_ENABLED: false,

  /**
   * Allow fallback to web checkout when native billing fails.
   */
  FALLBACK_TO_WEB: true,

  /**
   * Show "Subscribe on web" message on iOS when IAP not ready.
   */
  SHOW_WEB_SUBSCRIBE_PROMPT: true,

  /**
   * Enable subscription management via Stripe Customer Portal.
   */
  STRIPE_PORTAL_ENABLED: true,
};

/**
 * Get product configuration by tier
 */
export function getProductByTier(tier: SubscriptionTier): ProductConfig | null {
  const productKey = TIER_TO_PRODUCT[tier];
  if (!productKey) return null;
  return BILLING_PRODUCTS[productKey] || null;
}

/**
 * Get product configuration by Stripe product ID
 */
export function getProductByStripeId(stripeProductId: string): ProductConfig | null {
  return Object.values(BILLING_PRODUCTS).find(p => p.stripeProductId === stripeProductId) || null;
}

/**
 * Get tier from Stripe product ID
 */
export function getTierFromStripeProductId(stripeProductId: string): SubscriptionTier {
  for (const [key, product] of Object.entries(BILLING_PRODUCTS)) {
    if (product.stripeProductId === stripeProductId) {
      // Find the tier that maps to this product key
      for (const [tier, productKey] of Object.entries(TIER_TO_PRODUCT)) {
        if (productKey === key) {
          return tier as SubscriptionTier;
        }
      }
    }
  }
  return 'free';
}

/**
 * Check if a product requires IAP on iOS
 */
export function requiresIAPOnIOS(productKey: string): boolean {
  const product = BILLING_PRODUCTS[productKey];
  return product?.requiresIAPOnIOS ?? true;
}

/**
 * Map of tiers to their entitlements (for unified store)
 */
export const TIER_ENTITLEMENTS: Record<SubscriptionTier, EntitlementId[]> = {
  'free': FREE_ENTITLEMENTS,
  'explorer': BILLING_PRODUCTS['consumer-explorer'].entitlements,
  'frequent-chraveler': BILLING_PRODUCTS['consumer-frequent-chraveler'].entitlements,
  'pro-starter': BILLING_PRODUCTS['pro-starter'].entitlements,
  'pro-growth': BILLING_PRODUCTS['pro-growth'].entitlements,
  'pro-enterprise': BILLING_PRODUCTS['pro-enterprise'].entitlements,
};
