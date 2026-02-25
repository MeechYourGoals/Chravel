/**
 * Billing Provider Base Interface
 *
 * Abstract interface that all billing providers must implement.
 * Allows for platform-specific implementations (Stripe, Apple IAP, Google Play).
 */

import type {
  BillingPlatform,
  Product,
  PurchaseResult,
  PurchaseRequest,
  UserEntitlements,
} from '../types';

/**
 * Abstract billing provider interface
 */
export interface BillingProvider {
  /**
   * The platform this provider is for
   */
  readonly platform: BillingPlatform;

  /**
   * Human-readable name for logging/debugging
   */
  readonly name: string;

  /**
   * Check if the provider is available and configured
   */
  isAvailable(): boolean;

  /**
   * Get available products for purchase
   */
  getProducts(): Promise<Product[]>;

  /**
   * Initiate a purchase
   */
  purchase(request: PurchaseRequest): Promise<PurchaseResult>;

  /**
   * Restore previous purchases (mainly for IAP)
   */
  restorePurchases(): Promise<UserEntitlements | null>;

  /**
   * Open subscription management UI
   * (Stripe Customer Portal, iOS Settings, etc.)
   */
  openManagement(): Promise<void>;

  /**
   * Verify and refresh entitlements from the provider
   */
  verifyEntitlements(userId: string): Promise<UserEntitlements>;
}

/**
 * Base class with common functionality
 */
export abstract class BaseBillingProvider implements BillingProvider {
  abstract readonly platform: BillingPlatform;
  abstract readonly name: string;

  abstract isAvailable(): boolean;
  abstract getProducts(): Promise<Product[]>;
  abstract purchase(request: PurchaseRequest): Promise<PurchaseResult>;
  abstract restorePurchases(): Promise<UserEntitlements | null>;
  abstract openManagement(): Promise<void>;
  abstract verifyEntitlements(userId: string): Promise<UserEntitlements>;

  /**
   * Log a billing event for debugging
   */
  protected log(message: string, data?: unknown): void {
    console.log(`[Billing:${this.name}] ${message}`, data ?? '');
  }

  /**
   * Log an error
   */
  protected logError(message: string, error?: unknown): void {
    console.error(`[Billing:${this.name}] ${message}`, error ?? '');
  }
}
