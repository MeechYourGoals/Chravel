// Stripe product and price mapping
export const STRIPE_PRODUCTS = {
  // Consumer Plans - NEW 3-TIER STRUCTURE
  'consumer-explorer': {
    product_id: 'prod_TBD_EXPLORER', // To be created in Stripe
    price_monthly_id: 'price_explorer_monthly_9_99',
    price_annual_id: 'price_explorer_annual_99',
    name: 'Explorer',
    monthly_price: 9.99,
    annual_price: 99,
  },
  'consumer-frequent-chraveler': {
    product_id: 'prod_TBD_FREQUENT_CHRAVELER', // To be created in Stripe
    price_monthly_id: 'price_fc_monthly_19_99',
    price_annual_id: 'price_fc_annual_199',
    name: 'Frequent Chraveler',
    monthly_price: 19.99,
    annual_price: 199,
  },
  // Legacy - Keep for backward compatibility
  'consumer-plus': {
    product_id: 'prod_TBIgoaG5RiY45u',
    price_id: 'price_1SEw5402kHnoJKm0cVP4HlOh',
    name: 'Consumer Plus (Legacy)',
    price: 9.99,
  },
  'pro-starter': {
    product_id: 'prod_TBIiiBIOZryjJH',
    price_id: 'price_1SEw6t02kHnoJKm0OmIvxWW9',
    name: 'Pro Starter',
    price: 49,
  },
  'pro-growing': {
    product_id: 'prod_TBIi8DMSX1VUEr',
    price_id: 'price_1SEw7E02kHnoJKm0HPnZzLrj',
    name: 'Pro Growing',
    price: 199,
  },
  'pro-enterprise': {
    product_id: 'prod_TBIihCj6YgxiTp',
    price_id: 'price_1SEw7L02kHnoJKm0o0TLldSz',
    name: 'Pro Enterprise',
    price: 499,
  },
} as const;

export type StripeTier = keyof typeof STRIPE_PRODUCTS;

export const SUBSCRIPTION_TIER_MAP = {
  'starter': 'pro-starter',
  'growing': 'pro-growing',
  'enterprise': 'pro-enterprise',
  'enterprise-plus': 'pro-enterprise', // Map to same as enterprise for now
} as const;
