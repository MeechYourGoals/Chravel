/**
 * Billing Module
 *
 * Platform-agnostic billing abstraction for Chravel.
 * Supports Stripe (web), Apple IAP (iOS), and Google Play (Android).
 *
 * Usage:
 *
 * ```tsx
 * import { useBilling, useEntitlements, useFeatureAccess } from '@/billing';
 *
 * // Full billing state and actions
 * const { tier, canUseFeature, purchase, openManagement } = useBilling();
 *
 * // Lightweight entitlement checks
 * const { canUse, hasEntitlement } = useEntitlements();
 *
 * // Single feature check
 * const { canAccess, limit } = useFeatureAccess('ai_concierge');
 * ```
 *
 * @module billing
 */

// Types
export type {
  EntitlementId,
  SubscriptionTier,
  BillingSource,
  BillingPlatform,
  UserEntitlements,
  FeatureName,
  FeatureContext,
  Product,
  PurchaseRequest,
  PurchaseResult,
} from './types';

// Config
export {
  BILLING_PRODUCTS,
  BILLING_FLAGS,
  TIER_TO_PRODUCT,
  FREE_ENTITLEMENTS,
  getProductByTier,
  getProductByStripeId,
  getTierFromStripeProductId,
  requiresIAPOnIOS,
} from './config';

// Entitlements
export {
  getEntitlements,
  canUseFeature,
  getFeatureLimit,
  getEntitlementsForTier,
} from './entitlements';

// Providers
export {
  getBillingProvider,
  getStripeProvider,
  getAppleProvider,
  getPlatform,
  isNativePlatform,
  canUseWebCheckout,
  requiresIAPForTier,
  getPlatformProductId,
} from './providers';

export type { BillingProvider } from './providers/base';

// Hooks
export { useBilling } from './hooks/useBilling';
export type { UseBillingReturn } from './hooks/useBilling';

export { useEntitlements, useFeatureAccess, useProAccess } from './hooks/useEntitlements';
export type { UseEntitlementsReturn } from './hooks/useEntitlements';
