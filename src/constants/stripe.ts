/**
 * Stripe Configuration - Single Source of Truth
 * 
 * IMPORTANT: After creating products in Stripe Dashboard, update the
 * product_id and price_id values below with the actual IDs from Stripe.
 * 
 * Account: christian@chravelapp.com
 * Environment: TEST MODE
 * Publishable Key: pk_test_51SEwpx3EeswiMlDCJa7mXUSDaiVFWY4CBcVGPtGI6XboGtFHGTlhBwhHaJMIbjGS5FpZ56mCO98wckXaYoW13mDB00vqLDRCZp
 */

// ============================================================
// CONSUMER PLANS - ChravelApp Plus
// ============================================================

export const CONSUMER_PLANS = {
  free: {
    name: 'Free',
    tier: 'free',
    features: {
      activeTrips: 3,
      aiQueriesPerTrip: 10,
      freeProTrips: 1,
      freeEvents: 1,
    },
  },
  explorer: {
    name: 'Explorer',
    tier: 'explorer',
    product_id: 'PLACEHOLDER_EXPLORER_PRODUCT', // TODO: Replace after Stripe setup
    monthly: {
      price_id: 'PLACEHOLDER_EXPLORER_MONTHLY', // TODO: Replace after Stripe setup
      amount: 999, // $9.99 in cents
    },
    annual: {
      price_id: 'PLACEHOLDER_EXPLORER_ANNUAL', // TODO: Replace after Stripe setup
      amount: 9900, // $99.00 in cents
    },
    features: {
      activeTrips: 'unlimited',
      aiQueries: 'unlimited',
      events: { maxAttendees: 100 },
    },
  },
  'frequent-chraveler': {
    name: 'Frequent Chraveler',
    tier: 'frequent-chraveler',
    product_id: 'PLACEHOLDER_FREQUENT_PRODUCT', // TODO: Replace after Stripe setup
    monthly: {
      price_id: 'PLACEHOLDER_FREQUENT_MONTHLY', // TODO: Replace after Stripe setup
      amount: 1999, // $19.99 in cents
    },
    annual: {
      price_id: 'PLACEHOLDER_FREQUENT_ANNUAL', // TODO: Replace after Stripe setup
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
    product_id: 'PLACEHOLDER_PRO_STARTER_PRODUCT', // TODO: Replace after Stripe setup
    price_id: 'PLACEHOLDER_PRO_STARTER_PRICE', // TODO: Replace after Stripe setup
    amount: 4900, // $49/mo in cents
    memberLimit: 50,
  },
  growth: {
    name: 'Growth Pro',
    tier: 'pro-growth',
    product_id: 'PLACEHOLDER_PRO_GROWTH_PRODUCT', // TODO: Replace after Stripe setup
    price_id: 'PLACEHOLDER_PRO_GROWTH_PRICE', // TODO: Replace after Stripe setup
    amount: 9900, // $99/mo in cents
    memberLimit: 100,
  },
  enterprise: {
    name: 'Enterprise',
    tier: 'pro-enterprise',
    product_id: 'PLACEHOLDER_PRO_ENTERPRISE_PRODUCT', // TODO: Replace after Stripe setup
    price_id: 'PLACEHOLDER_PRO_ENTERPRISE_PRICE', // TODO: Replace after Stripe setup
    amount: 19900, // $199/mo in cents
    memberLimit: 250,
  },
} as const;

// ============================================================
// PRICE ID LOOKUP (for checkout)
// ============================================================

export function getPriceId(tier: string, billingCycle: 'monthly' | 'annual' = 'monthly'): string | null {
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
  // Consumer plans
  if (productId === CONSUMER_PLANS.explorer.product_id) return 'explorer';
  if (productId === CONSUMER_PLANS['frequent-chraveler'].product_id) return 'frequent-chraveler';
  
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
    product_id_annual: CONSUMER_PLANS.explorer.product_id,
    price_monthly_id: CONSUMER_PLANS.explorer.monthly.price_id,
    price_annual_id: CONSUMER_PLANS.explorer.annual.price_id,
    name: 'Explorer',
    monthly_price: 9.99,
    annual_price: 99,
  },
  'consumer-frequent-chraveler': {
    product_id_monthly: CONSUMER_PLANS['frequent-chraveler'].product_id,
    product_id_annual: CONSUMER_PLANS['frequent-chraveler'].product_id,
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
  'starter': 'pro-starter',
  'growing': 'pro-growing',
  'enterprise': 'pro-enterprise',
  'enterprise-plus': 'pro-enterprise',
} as const;
