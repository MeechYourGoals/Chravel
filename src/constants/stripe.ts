// Stripe product and price mapping
export const STRIPE_PRODUCTS = {
  // Consumer Plans - Active subscriptions with monthly & annual billing
  'consumer-explorer': {
    product_id_monthly: 'prod_TUSZK0AHZUxjSs',
    product_id_annual: 'prod_TUSZvz0y7GjzrW',
    price_monthly_id: 'price_1SXTec02kHnoJKm0LMzJrQsU',
    price_annual_id: 'price_1SXTed02kHnoJKm0UUTa0Zae',
    name: 'Explorer',
    monthly_price: 9.99,
    annual_price: 99,
  },
  'consumer-frequent-chraveler': {
    product_id_monthly: 'prod_TUSZwE8Px8dtsw',
    product_id_annual: 'prod_TUSZ2IsZkY3kZE',
    price_monthly_id: 'price_1SXTee02kHnoJKm0htJtEiCE',
    price_annual_id: 'price_1SXTef02kHnoJKm0uddOgvCF',
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
  // Pro Plans - NEW PRICING (December 2024)
  'pro-starter': {
    product_id: 'prod_TX9iM9JRPyeuQD',
    price_id: 'price_1Sa5P202kHnoJKm0xF6yaIva',
    name: 'Pro Starter',
    price: 49,
    member_limit: 50,
  },
  'pro-growing': {
    product_id: 'prod_TX9ipGhU3RdKF8',
    price_id: 'price_1Sa5P402kHnoJKm03NTbRDYr',
    name: 'Pro Growth',
    price: 99,
    member_limit: 100,
  },
  'pro-enterprise': {
    product_id: 'prod_TX9iwkqlB0oOy2',
    price_id: 'price_1Sa5P502kHnoJKm07b3ZACeF',
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
  'enterprise-plus': 'pro-enterprise', // Map to same as enterprise for now
} as const;
