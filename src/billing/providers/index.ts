/**
 * Billing Provider Selector
 * 
 * Selects the appropriate billing provider based on platform and context.
 * Handles the complexity of iOS IAP requirements vs web checkout.
 */

import { Capacitor } from '@capacitor/core';
import type { BillingProvider } from './base';
import { StripeProvider } from './stripe';
import { AppleIAPProvider } from './iap';
import { BILLING_FLAGS, BILLING_PRODUCTS } from '../config';
import type { SubscriptionTier, BillingPlatform } from '../types';

// Singleton instances
let stripeProvider: StripeProvider | null = null;
let appleProvider: AppleIAPProvider | null = null;
// let googleProvider: GooglePlayProvider | null = null; // TODO: Future

/**
 * Get the current platform
 */
export function getPlatform(): BillingPlatform {
  const platform = Capacitor.getPlatform();
  
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

/**
 * Check if running on native platform
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the Stripe provider (singleton)
 */
export function getStripeProvider(): StripeProvider {
  if (!stripeProvider) {
    stripeProvider = new StripeProvider();
  }
  return stripeProvider;
}

/**
 * Get the Apple IAP provider (singleton)
 */
export function getAppleProvider(): AppleIAPProvider {
  if (!appleProvider) {
    appleProvider = new AppleIAPProvider();
  }
  return appleProvider;
}

/**
 * Get the appropriate billing provider for the current context
 * 
 * Logic:
 * - iOS + Consumer plan + IAP enabled → Apple IAP
 * - iOS + Consumer plan + IAP disabled → Show "subscribe on web"
 * - iOS + Pro plan → Stripe (B2B exception)
 * - Android + Google Billing enabled → Google Play
 * - Web → Stripe
 */
export function getBillingProvider(tier?: SubscriptionTier): BillingProvider {
  const platform = getPlatform();
  
  // Web always uses Stripe
  if (platform === 'web') {
    return getStripeProvider();
  }
  
  // iOS handling
  if (platform === 'ios') {
    // Check if this is a consumer plan (requires IAP)
    const requiresIAP = tier ? requiresIAPForTier(tier) : true;
    
    if (requiresIAP) {
      // Consumer plans must use IAP when available
      if (BILLING_FLAGS.APPLE_IAP_ENABLED) {
        return getAppleProvider();
      }
      
      // IAP not enabled - will show "subscribe on web" message
      // Return Apple provider so it can handle the error appropriately
      return getAppleProvider();
    }
    
    // Pro/Enterprise plans can use Stripe (B2B exception)
    return getStripeProvider();
  }
  
  // Android handling
  if (platform === 'android') {
    // TODO: Implement Google Play Billing
    // For now, fall back to Stripe
    // if (BILLING_FLAGS.GOOGLE_BILLING_ENABLED) {
    //   return getGoogleProvider();
    // }
    
    return getStripeProvider();
  }
  
  // Fallback to Stripe
  return getStripeProvider();
}

/**
 * Check if a tier requires IAP on iOS
 */
export function requiresIAPForTier(tier: SubscriptionTier): boolean {
  // Free tier doesn't require any purchase
  if (tier === 'free') return false;
  
  // Pro plans can use external payment (B2B exception)
  if (tier.startsWith('pro-')) return false;
  
  // Consumer plans (explorer, frequent-chraveler) require IAP
  return true;
}

/**
 * Check if web checkout can be used
 * 
 * Returns true if:
 * - Running on web
 * - Running on iOS with a Pro plan (B2B exception)
 * - Fallback is enabled and IAP is not available
 */
export function canUseWebCheckout(tier?: SubscriptionTier): boolean {
  const platform = getPlatform();
  
  // Web always uses Stripe
  if (platform === 'web') return true;
  
  // iOS with Pro plan can use web checkout
  if (platform === 'ios' && tier && tier.startsWith('pro-')) {
    return true;
  }
  
  // iOS with consumer plan - check fallback flag
  if (platform === 'ios' && BILLING_FLAGS.FALLBACK_TO_WEB && !BILLING_FLAGS.APPLE_IAP_ENABLED) {
    // Note: This might still get rejected by App Review
    // Only use for "subscribe on web" messaging, not actual checkout
    return false;
  }
  
  // Android with no Google Billing can use web
  if (platform === 'android' && !BILLING_FLAGS.GOOGLE_BILLING_ENABLED) {
    // Note: Similar to iOS, might have issues with Play Store
    return BILLING_FLAGS.FALLBACK_TO_WEB;
  }
  
  return false;
}

/**
 * Get a product ID for the current platform
 */
export function getPlatformProductId(
  productKey: string, 
  billingCycle: 'monthly' | 'annual'
): string | null {
  const product = BILLING_PRODUCTS[productKey];
  if (!product) return null;
  
  const platform = getPlatform();
  
  if (platform === 'ios') {
    return billingCycle === 'annual' 
      ? product.appleProductIdAnnual || null
      : product.appleProductIdMonthly || null;
  }
  
  if (platform === 'android') {
    return billingCycle === 'annual'
      ? product.googleProductIdAnnual || null
      : product.googleProductIdMonthly || null;
  }
  
  // Web uses Stripe price IDs
  return billingCycle === 'annual'
    ? product.stripePriceIdAnnual || null
    : product.stripePriceIdMonthly;
}
