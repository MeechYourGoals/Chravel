/**
 * Stripe Billing Provider
 * 
 * Handles subscription billing via Stripe Checkout on web.
 * Also used for Pro/Enterprise plans on iOS (B2B exception).
 */

import { supabase } from '@/integrations/supabase/client';
import { BaseBillingProvider } from './base';
import { BILLING_PRODUCTS, getProductByTier } from '../config';
import { getEntitlements } from '../entitlements';
import type { 
  BillingPlatform,
  Product, 
  PurchaseRequest, 
  PurchaseResult, 
  UserEntitlements,
} from '../types';

export class StripeProvider extends BaseBillingProvider {
  readonly platform: BillingPlatform = 'web';
  readonly name = 'Stripe';
  
  isAvailable(): boolean {
    // Stripe is always available on web
    return true;
  }
  
  async getProducts(): Promise<Product[]> {
    // Return products from our config
    return Object.entries(BILLING_PRODUCTS).map(([key, config]) => ({
      id: key,
      name: config.name,
      description: `${config.name} subscription`,
      priceMonthly: config.priceMonthly,
      priceAnnual: config.priceAnnual,
      currency: 'USD',
      tier: key.includes('explorer') ? 'explorer' : 
            key.includes('frequent') ? 'frequent-chraveler' :
            key.includes('starter') ? 'pro-starter' :
            key.includes('growth') ? 'pro-growth' :
            key.includes('enterprise') ? 'pro-enterprise' : 'free',
      entitlements: config.entitlements,
    })) as Product[];
  }
  
  async purchase(request: PurchaseRequest): Promise<PurchaseResult> {
    this.log('Starting Stripe checkout', request);
    
    try {
      const product = getProductByTier(request.tier);
      if (!product) {
        return {
          success: false,
          error: 'Product not found',
          errorCode: 'UNKNOWN',
        };
      }
      
      // Determine which tier key to use
      const tierMap: Record<string, string> = {
        'explorer': 'consumer-explorer',
        'frequent-chraveler': 'consumer-frequent-chraveler',
        'pro-starter': 'pro-starter',
        'pro-growth': 'pro-growth',
        'pro-enterprise': 'pro-enterprise',
      };
      
      const tierKey = tierMap[request.tier];
      if (!tierKey) {
        return {
          success: false,
          error: 'Invalid tier',
          errorCode: 'UNKNOWN',
        };
      }
      
      // Call create-checkout Edge Function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          tier: tierKey,
          billing_cycle: request.billingCycle,
        },
      });
      
      if (error) {
        this.logError('Checkout creation failed', error);
        return {
          success: false,
          error: error.message || 'Failed to create checkout session',
          errorCode: 'PAYMENT_FAILED',
        };
      }
      
      if (data?.url) {
        // Open Stripe Checkout in new tab
        window.open(data.url, '_blank');
        
        return {
          success: true,
          // Note: Actual entitlements will be updated after webhook/polling
        };
      }
      
      return {
        success: false,
        error: 'No checkout URL returned',
        errorCode: 'UNKNOWN',
      };
    } catch (error) {
      this.logError('Unexpected error during purchase', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNKNOWN',
      };
    }
  }
  
  async restorePurchases(): Promise<UserEntitlements | null> {
    // For Stripe, "restoring" means re-checking the subscription status
    this.log('Restoring purchases (re-checking subscription)');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    return getEntitlements(user.id);
  }
  
  async openManagement(): Promise<void> {
    this.log('Opening Stripe Customer Portal');
    
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        this.logError('Failed to create portal session', error);
        throw error;
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      this.logError('Error opening management portal', error);
      throw error;
    }
  }
  
  async verifyEntitlements(userId: string): Promise<UserEntitlements> {
    return getEntitlements(userId);
  }
}
