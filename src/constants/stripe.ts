// Stripe product and price mapping
export const STRIPE_PRODUCTS = {
  // Consumer Plans - NEW STRUCTURE
  'consumer-starter': {
    product_id: 'prod_TBD_STARTER', // To be created in Stripe
    price_monthly_id: 'price_starter_monthly_9_99',
    price_annual_id: 'price_starter_annual_99_99',
    name: 'Starter',
    monthly_price: 9.99,
    annual_price: 99.99,
  },
  'consumer-explorer': {
    product_id: 'prod_TBD_EXPLORER', // To be created in Stripe
    price_monthly_id: 'price_explorer_monthly_19_99',
    price_annual_id: 'price_explorer_annual_199_99',
    name: 'Explorer',
    monthly_price: 19.99,
    annual_price: 199.99,
  },
  'consumer-unlimited': {
    product_id: 'prod_TBD_UNLIMITED', // To be created in Stripe
    price_monthly_id: 'price_unlimited_monthly_39_99',
    price_annual_id: 'price_unlimited_annual_399_99',
    name: 'Unlimited',
    monthly_price: 39.99,
    annual_price: 399.99,
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
