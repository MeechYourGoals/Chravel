/**
 * RevenueCat TypeScript Types
 * 
 * Simplified types for RevenueCat Capacitor plugin responses
 */

import type { SubscriptionTier } from '@/billing/types';

/**
 * Platform detection result
 */
export type RevenueCatPlatform = 'ios' | 'android' | 'web';

/**
 * Entitlement status from RevenueCat
 */
export interface RevenueCatEntitlementInfo {
  identifier: string;
  isActive: boolean;
  willRenew: boolean;
  periodType: 'normal' | 'trial' | 'intro';
  latestPurchaseDate: string | null;
  originalPurchaseDate: string | null;
  expirationDate: string | null;
  productIdentifier: string;
  isSandbox: boolean;
  unsubscribeDetectedAt: string | null;
  billingIssueDetectedAt: string | null;
}

/**
 * Customer info from RevenueCat
 */
export interface RevenueCatCustomerInfo {
  originalAppUserId: string;
  activeSubscriptions: string[];
  allPurchasedProductIdentifiers: string[];
  entitlements: {
    active: Record<string, RevenueCatEntitlementInfo>;
    all: Record<string, RevenueCatEntitlementInfo>;
  };
  firstSeen: string;
  latestExpirationDate: string | null;
  managementURL: string | null;
  nonSubscriptionTransactions: unknown[];
  originalPurchaseDate: string | null;
  requestDate: string;
}

/**
 * Package from RevenueCat offerings
 */
export interface RevenueCatPackage {
  identifier: string;
  packageType: 'MONTHLY' | 'ANNUAL' | 'WEEKLY' | 'LIFETIME' | 'CUSTOM';
  product: {
    identifier: string;
    title: string;
    description: string;
    price: number;
    priceString: string;
    currencyCode: string;
  };
  offeringIdentifier: string;
}

/**
 * Offering from RevenueCat
 */
export interface RevenueCatOffering {
  identifier: string;
  serverDescription: string;
  metadata: Record<string, unknown>;
  availablePackages: RevenueCatPackage[];
  monthly: RevenueCatPackage | null;
  annual: RevenueCatPackage | null;
  lifetime: RevenueCatPackage | null;
}

/**
 * Offerings response
 */
export interface RevenueCatOfferings {
  current: RevenueCatOffering | null;
  all: Record<string, RevenueCatOffering>;
}

/**
 * Result of RevenueCat operations
 */
export interface RevenueCatResult<T = unknown> {
  success: boolean;
  supported: boolean;
  data?: T;
  error?: string;
  errorCode?: 'NOT_CONFIGURED' | 'NOT_SUPPORTED' | 'CANCELLED' | 'NETWORK_ERROR' | 'UNKNOWN';
}

/**
 * Purchase result
 */
export interface RevenueCatPurchaseResult extends RevenueCatResult<RevenueCatCustomerInfo> {
  transactionId?: string;
}

/**
 * Derived plan from RevenueCat entitlements
 */
export interface DerivedPlan {
  tier: SubscriptionTier;
  status: 'active' | 'trialing' | 'expired' | 'canceled';
  currentPeriodEnd: Date | null;
  source: 'revenuecat';
  entitlements: string[];
}

/**
 * Sync request to edge function
 */
export interface SyncEntitlementsRequest {
  customerInfo: {
    originalAppUserId: string;
    entitlements: {
      active: Record<string, { isActive: boolean; expirationDate: string | null }>;
    };
    latestExpirationDate: string | null;
  };
}

/**
 * Sync response from edge function
 */
export interface SyncEntitlementsResponse {
  success: boolean;
  plan: SubscriptionTier;
  status: 'active' | 'trialing' | 'expired' | 'canceled';
  currentPeriodEnd: string | null;
  entitlements: string[];
  error?: string;
}
