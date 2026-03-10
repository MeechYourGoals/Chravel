/**
 * Stripe Configuration - Single Source of Truth
 *
 * IMPORTANT: After creating products in Stripe Dashboard, update the
 * product_id and price_id values below with the actual IDs from Stripe.
 *
 * Environment: Configured via VITE_STRIPE_PUBLISHABLE_KEY env var
 */

// ============================================================
// CONSUMER PLANS - ChravelApp Plus
// ============================================================

/**
 * Consumer Plans - AI Query Limits:
 * - Free: 5 queries per user per trip
 * - Explorer: 10 queries per user per trip
 * - Frequent Chraveler: Unlimited
 */
export const CONSUMER_PLANS = {
  free: {
    name: 'Free',
    tier: 'free',
    features: {
      activeTrips: 3,
      aiQueriesPerTrip: 5, // 5 queries per user per trip
      freeProTrips: 1,
      freeEvents: 1,
    },
  },
  explorer: {
    name: 'Explorer',
    tier: 'explorer',
    product_id: 'prod_U73VxEnvEHbBrx',
    product_id_annual: 'prod_U73VrTc4sE8AIv', // Separate annual product in Stripe
    monthly: {
      price_id: 'price_1T8pOc47wCAQ57MmWsPX3Jku',
      amount: 999, // $9.99 in cents
    },
    annual: {
      price_id: 'price_1T8pOl47wCAQ57MmDT7uefS7', // Belongs to prod_U73VrTc4sE8AIv
      amount: 9900, // $99.00 in cents
    },
    features: {
      activeTrips: 'unlimited',
      aiQueriesPerTrip: 10, // 10 queries per user per trip
      events: { maxAttendees: 100 },
    },
  },
  'frequent-chraveler': {
    name: 'Frequent Chraveler',
    tier: 'frequent-chraveler',
    product_id: 'prod_U73VfiKf3VrJKf',
    product_id_annual: 'prod_U73VqblRTSr2XZ', // Separate annual product in Stripe
    monthly: {
      price_id: 'price_1T8pOd47wCAQ57MmIrACPNpc',
      amount: 1999, // $19.99 in cents
    },
    annual: {
      price_id: 'price_1T8pOl47wCAQ57MmrhqSZM2j', // Belongs to prod_U73VqblRTSr2XZ
      amount: 19900, // $199.00 in cents
    },
    features: {
      activeTrips: 'unlimited',
      aiQueries: 'unlimited',
      events: { maxAttendees: 200 },
      pdfExport: true,
      calendarSync: true,
    },
  },
} as const;

// ============================================================
// PRO PLANS - ChravelApp Pro (Organizations)
// ============================================================

export const PRO_PLANS = {
  starter: {
    name: 'Starter Pro',
    tier: 'pro-starter',
    product_id: 'prod_U73Vlcl4lqgsb4',
    price_id: 'price_1T8pOe47wCAQ57MmkShIK75i',
    amount: 4900, // $49/mo in cents
    memberLimit: 50,
  },
  growth: {
    name: 'Growth Pro',
    tier: 'pro-growth',
    product_id: 'prod_U73VPX6TlClQ7J',
    price_id: 'price_1T8pOf47wCAQ57Mm5k8uVQrW',
    amount: 9900, // $99/mo in cents
    memberLimit: 100,
  },
  enterprise: {
    name: 'Enterprise',
    tier: 'pro-enterprise',
    product_id: 'prod_U73Vd6QW4pEY9x',
    price_id: 'price_1T8pOg47wCAQ57MmcEPnjd3s',
    amount: 0, // Custom Pricing - Contact Sales (billing@chravelapp.com)
    memberLimit: 250,
  },
} as const;

// ============================================================
// TRIP PASS PRODUCTS (One-Time Purchases)
// ============================================================

export const TRIP_PASS_PLANS = {
  'pass-explorer-45': {
    name: 'Explorer Trip Pass (45 days)',
    tier: 'explorer',
    product_id: 'prod_U73WaALe9yjrAR',
    price_id: 'price_1T8pP047wCAQ57Mm6sfNTg2w',
    amount: 3999, // $39.99
    durationDays: 45,
  },
  'pass-frequent-90': {
    name: 'Frequent Chraveler Trip Pass (90 days)',
    tier: 'frequent-chraveler',
    product_id: 'prod_U73W99ebeJvbLB',
    price_id: 'price_1T8pP047wCAQ57Mm2DOch99F',
    amount: 7499, // $74.99
    durationDays: 90,
  },
} as const;

// ============================================================
// PRICE ID LOOKUP (for checkout)
// ============================================================

export function getPriceId(
  tier: string,
  billingCycle: 'monthly' | 'annual' = 'monthly',
): string | null {
  // Consumer plans
  if (tier === 'explorer') {
    return billingCycle === 'annual'
      ? CONSUMER_PLANS.explorer.annual.price_id
      : CONSUMER_PLANS.explorer.monthly.price_id;
  }
  if (tier === 'frequent-chraveler') {
    return billingCycle === 'annual'
      ? CONSUMER_PLANS['frequent-chraveler'].annual.price_id
      : CONSUMER_PLANS['frequent-chraveler'].monthly.price_id;
  }

  // Pro plans (monthly only)
  if (tier === 'pro-starter') return PRO_PLANS.starter.price_id;
  if (tier === 'pro-growth') return PRO_PLANS.growth.price_id;
  if (tier === 'pro-enterprise') return PRO_PLANS.enterprise.price_id;

  return null;
}

// ============================================================
// PRODUCT ID → TIER MAPPING (for subscription checks)
// ============================================================

export function getTierFromProductId(productId: string): string {
  // Consumer plans (monthly + annual are separate products in Stripe)
  if (productId === CONSUMER_PLANS.explorer.product_id) return 'explorer';
  if (productId === CONSUMER_PLANS.explorer.product_id_annual) return 'explorer';
  if (productId === CONSUMER_PLANS['frequent-chraveler'].product_id) return 'frequent-chraveler';
  if (productId === CONSUMER_PLANS['frequent-chraveler'].product_id_annual)
    return 'frequent-chraveler';

  // Trip Pass products
  if (productId === TRIP_PASS_PLANS['pass-explorer-45'].product_id) return 'explorer';
  if (productId === TRIP_PASS_PLANS['pass-frequent-90'].product_id) return 'frequent-chraveler';

  // Pro plans
  if (productId === PRO_PLANS.starter.product_id) return 'pro-starter';
  if (productId === PRO_PLANS.growth.product_id) return 'pro-growth';
  if (productId === PRO_PLANS.enterprise.product_id) return 'pro-enterprise';

  return 'free';
}

// ============================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================

export const STRIPE_PRODUCTS = {
  'consumer-explorer': {
    product_id_monthly: CONSUMER_PLANS.explorer.product_id,
    product_id_annual: CONSUMER_PLANS.explorer.product_id_annual,
    price_monthly_id: CONSUMER_PLANS.explorer.monthly.price_id,
    price_annual_id: CONSUMER_PLANS.explorer.annual.price_id,
    name: 'Explorer',
    monthly_price: 9.99,
    annual_price: 99,
  },
  'consumer-frequent-chraveler': {
    product_id_monthly: CONSUMER_PLANS['frequent-chraveler'].product_id,
    product_id_annual: CONSUMER_PLANS['frequent-chraveler'].product_id_annual,
    price_monthly_id: CONSUMER_PLANS['frequent-chraveler'].monthly.price_id,
    price_annual_id: CONSUMER_PLANS['frequent-chraveler'].annual.price_id,
    name: 'Frequent Chraveler',
    monthly_price: 19.99,
    annual_price: 199,
  },
  'pro-starter': {
    product_id: PRO_PLANS.starter.product_id,
    price_id: PRO_PLANS.starter.price_id,
    name: 'Pro Starter',
    price: 49,
    member_limit: 50,
  },
  'pro-growing': {
    product_id: PRO_PLANS.growth.product_id,
    price_id: PRO_PLANS.growth.price_id,
    name: 'Pro Growth',
    price: 99,
    member_limit: 100,
  },
  'pro-enterprise': {
    product_id: PRO_PLANS.enterprise.product_id,
    price_id: PRO_PLANS.enterprise.price_id,
    name: 'Pro Enterprise',
    price: 199,
    member_limit: 250,
  },
} as const;

export type StripeTier = keyof typeof STRIPE_PRODUCTS;

export const SUBSCRIPTION_TIER_MAP = {
  starter: 'pro-starter',
  growing: 'pro-growing',
  enterprise: 'pro-enterprise',
  'enterprise-plus': 'pro-enterprise',
} as const;
