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
  // Pro Plans - Monthly subscriptions for organizations
  'pro-starter': {
    product_id: 'prod_TUSZ3TL7cgQGSs',
    price_id: 'price_1SXTeg02kHnoJKm0lCAhIoyY',
    name: 'Pro Starter',
    price: 49,
  },
  'pro-growing': {
    product_id: 'prod_TUSZycyjRavQuH',
    price_id: 'price_1SXTeh02kHnoJKm0M4hHcpls',
    name: 'Pro Growing',
    price: 199,
  },
  'pro-enterprise': {
    product_id: 'prod_TUSZvoEV9haJpI',
    price_id: 'price_1SXTei02kHnoJKm0KVmUbpkx',
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
