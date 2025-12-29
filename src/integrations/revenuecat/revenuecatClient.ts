/**
 * RevenueCat Client Wrapper
 * 
 * Platform-aware wrapper for RevenueCat Capacitor plugin.
 * Handles demo mode, web fallbacks, and graceful degradation.
 */

import { Capacitor } from '@capacitor/core';
import { 
  REVENUECAT_ENABLED, 
  getRevenueCatApiKey, 
  isRevenueCatConfigured,
  ENTITLEMENT_TO_TIER,
  REVENUECAT_ENTITLEMENTS,
} from '@/constants/revenuecat';
import type { 
  RevenueCatPlatform, 
  RevenueCatResult, 
  RevenueCatCustomerInfo, 
  RevenueCatOfferings,
  RevenueCatPurchaseResult,
  DerivedPlan,
} from './types';
import type { SubscriptionTier } from '@/billing/types';

// Lazy import for RevenueCat plugin (only loaded on native platforms)
let Purchases: typeof import('@revenuecat/purchases-capacitor').Purchases | null = null;

/**
 * Get current platform
 */
export function getPlatform(): RevenueCatPlatform {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

/**
 * Check if RevenueCat is available on this platform
 */
export function isRevenueCatAvailable(): boolean {
  const platform = getPlatform();
  return platform !== 'web' && REVENUECAT_ENABLED && isRevenueCatConfigured(platform);
}

/**
 * Load the RevenueCat plugin dynamically
 */
async function loadPurchasesPlugin(): Promise<typeof import('@revenuecat/purchases-capacitor').Purchases | null> {
  if (Purchases) return Purchases;
  
  try {
    const module = await import('@revenuecat/purchases-capacitor');
    Purchases = module.Purchases;
    return Purchases;
  } catch (error) {
    console.warn('[RevenueCat] Failed to load plugin:', error);
    return null;
  }
}

/**
 * Configure RevenueCat for the current user
 * 
 * @param userId - User ID to associate with RevenueCat
 * @param isDemoMode - If true, skip configuration
 */
export async function configureRevenueCat(
  userId: string, 
  isDemoMode: boolean = false
): Promise<RevenueCatResult> {
  // Demo mode: no-op
  if (isDemoMode) {
    console.log('[RevenueCat] Demo mode active, skipping configuration');
    return { success: true, supported: false, error: 'Demo mode active' };
  }

  // Check if enabled
  if (!REVENUECAT_ENABLED) {
    console.log('[RevenueCat] Feature flag disabled');
    return { success: false, supported: false, errorCode: 'NOT_CONFIGURED' };
  }

  const platform = getPlatform();
  
  // Web: not supported
  if (platform === 'web') {
    console.log('[RevenueCat] Web platform detected, IAP not supported');
    return { success: false, supported: false, errorCode: 'NOT_SUPPORTED' };
  }

  // Get API key
  const apiKey = getRevenueCatApiKey(platform);
  if (!apiKey) {
    console.warn('[RevenueCat] No API key configured for platform:', platform);
    return { success: false, supported: true, errorCode: 'NOT_CONFIGURED', error: 'API key not configured' };
  }

  // Load plugin
  const purchases = await loadPurchasesPlugin();
  if (!purchases) {
    return { success: false, supported: true, errorCode: 'NOT_SUPPORTED', error: 'Failed to load RevenueCat plugin' };
  }

  try {
    // Configure RevenueCat
    await purchases.configure({
      apiKey,
      appUserID: userId,
    });
    
    console.log('[RevenueCat] Configured successfully for user:', userId);
    return { success: true, supported: true };
  } catch (error) {
    console.error('[RevenueCat] Configuration failed:', error);
    return { 
      success: false, 
      supported: true, 
      errorCode: 'UNKNOWN', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get customer info from RevenueCat
 */
export async function getCustomerInfo(
  isDemoMode: boolean = false
): Promise<RevenueCatResult<RevenueCatCustomerInfo>> {
  if (isDemoMode) {
    return { success: false, supported: false, error: 'Demo mode active' };
  }

  if (!isRevenueCatAvailable()) {
    return { success: false, supported: false, errorCode: 'NOT_SUPPORTED' };
  }

  const purchases = await loadPurchasesPlugin();
  if (!purchases) {
    return { success: false, supported: true, errorCode: 'NOT_SUPPORTED' };
  }

  try {
    const { customerInfo } = await purchases.getCustomerInfo();
    return { 
      success: true, 
      supported: true, 
      data: customerInfo as unknown as RevenueCatCustomerInfo 
    };
  } catch (error) {
    console.error('[RevenueCat] Failed to get customer info:', error);
    return { 
      success: false, 
      supported: true, 
      errorCode: 'NETWORK_ERROR', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get available offerings
 */
export async function getOfferings(
  isDemoMode: boolean = false
): Promise<RevenueCatResult<RevenueCatOfferings>> {
  if (isDemoMode) {
    return { success: false, supported: false, error: 'Demo mode active' };
  }

  if (!isRevenueCatAvailable()) {
    return { success: false, supported: false, errorCode: 'NOT_SUPPORTED' };
  }

  const purchases = await loadPurchasesPlugin();
  if (!purchases) {
    return { success: false, supported: true, errorCode: 'NOT_SUPPORTED' };
  }

  try {
    // getOfferings returns PurchasesOfferings directly
    const offerings = await purchases.getOfferings();
    return { 
      success: true, 
      supported: true, 
      data: offerings as unknown as RevenueCatOfferings 
    };
  } catch (error) {
    console.error('[RevenueCat] Failed to get offerings:', error);
    return { 
      success: false, 
      supported: true, 
      errorCode: 'NETWORK_ERROR', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Purchase a package
 */
export async function purchasePackage(
  packageIdentifier: string,
  offeringIdentifier: string = 'default',
  isDemoMode: boolean = false
): Promise<RevenueCatPurchaseResult> {
  if (isDemoMode) {
    return { success: false, supported: false, error: 'Demo mode active' };
  }

  if (!isRevenueCatAvailable()) {
    return { success: false, supported: false, errorCode: 'NOT_SUPPORTED' };
  }

  const purchases = await loadPurchasesPlugin();
  if (!purchases) {
    return { success: false, supported: true, errorCode: 'NOT_SUPPORTED' };
  }

  try {
    // Get offerings first to find the package
    const offerings = await purchases.getOfferings();
    const offering = offerings?.all?.[offeringIdentifier] || offerings?.current;
    
    if (!offering) {
      return { success: false, supported: true, errorCode: 'UNKNOWN', error: 'No offering found' };
    }

    const pkg = offering.availablePackages?.find(p => p.identifier === packageIdentifier);
    if (!pkg) {
      return { success: false, supported: true, errorCode: 'UNKNOWN', error: 'Package not found' };
    }

    const { customerInfo } = await purchases.purchasePackage({ aPackage: pkg });
    
    console.log('[RevenueCat] Purchase successful');
    return { 
      success: true, 
      supported: true, 
      data: customerInfo as unknown as RevenueCatCustomerInfo 
    };
  } catch (error: unknown) {
    console.error('[RevenueCat] Purchase failed:', error);
    
    // Check for user cancellation
    const errorObj = error as { userCancelled?: boolean; message?: string };
    if (errorObj?.userCancelled) {
      return { success: false, supported: true, errorCode: 'CANCELLED', error: 'Purchase cancelled' };
    }
    
    return { 
      success: false, 
      supported: true, 
      errorCode: 'UNKNOWN', 
      error: errorObj?.message || 'Unknown error' 
    };
  }
}

/**
 * Restore purchases (required for Apple compliance)
 */
export async function restorePurchases(
  isDemoMode: boolean = false
): Promise<RevenueCatResult<RevenueCatCustomerInfo>> {
  if (isDemoMode) {
    return { success: false, supported: false, error: 'Demo mode active' };
  }

  if (!isRevenueCatAvailable()) {
    return { success: false, supported: false, errorCode: 'NOT_SUPPORTED' };
  }

  const purchases = await loadPurchasesPlugin();
  if (!purchases) {
    return { success: false, supported: true, errorCode: 'NOT_SUPPORTED' };
  }

  try {
    const { customerInfo } = await purchases.restorePurchases();
    console.log('[RevenueCat] Restore successful');
    return { 
      success: true, 
      supported: true, 
      data: customerInfo as unknown as RevenueCatCustomerInfo 
    };
  } catch (error) {
    console.error('[RevenueCat] Restore failed:', error);
    return { 
      success: false, 
      supported: true, 
      errorCode: 'NETWORK_ERROR', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Logout from RevenueCat
 */
export async function logoutRevenueCat(): Promise<RevenueCatResult> {
  if (!isRevenueCatAvailable()) {
    return { success: true, supported: false };
  }

  const purchases = await loadPurchasesPlugin();
  if (!purchases) {
    return { success: true, supported: false };
  }

  try {
    await purchases.logOut();
    console.log('[RevenueCat] Logged out');
    return { success: true, supported: true };
  } catch (error) {
    console.error('[RevenueCat] Logout failed:', error);
    return { success: false, supported: true, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Derive plan from RevenueCat customer info
 */
export function derivePlanFromCustomerInfo(customerInfo: RevenueCatCustomerInfo): DerivedPlan {
  const activeEntitlements = customerInfo.entitlements?.active || {};
  const entitlementIds = Object.keys(activeEntitlements);
  
  // Default to free
  let tier: SubscriptionTier = 'free';
  let status: 'active' | 'trialing' | 'expired' | 'canceled' = 'active';
  let currentPeriodEnd: Date | null = null;

  // Check for highest tier entitlement (frequent-chraveler > explorer)
  if (activeEntitlements[REVENUECAT_ENTITLEMENTS.frequentChraveler]?.isActive) {
    tier = 'frequent-chraveler';
    const entitlement = activeEntitlements[REVENUECAT_ENTITLEMENTS.frequentChraveler];
    if (entitlement.expirationDate) {
      currentPeriodEnd = new Date(entitlement.expirationDate);
    }
    if (entitlement.periodType === 'trial') {
      status = 'trialing';
    }
  } else if (activeEntitlements[REVENUECAT_ENTITLEMENTS.explorer]?.isActive) {
    tier = 'explorer';
    const entitlement = activeEntitlements[REVENUECAT_ENTITLEMENTS.explorer];
    if (entitlement.expirationDate) {
      currentPeriodEnd = new Date(entitlement.expirationDate);
    }
    if (entitlement.periodType === 'trial') {
      status = 'trialing';
    }
  }

  // Check for pro tiers (future use)
  for (const [entitlementId, info] of Object.entries(activeEntitlements)) {
    const mappedTier = ENTITLEMENT_TO_TIER[entitlementId];
    if (mappedTier && mappedTier.startsWith('pro-') && info.isActive) {
      tier = mappedTier;
      if (info.expirationDate) {
        currentPeriodEnd = new Date(info.expirationDate);
      }
      break;
    }
  }

  return {
    tier,
    status,
    currentPeriodEnd,
    source: 'revenuecat',
    entitlements: entitlementIds,
  };
}
