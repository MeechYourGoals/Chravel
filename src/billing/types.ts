/**
 * Billing Types
 *
 * Entitlement-based model for platform-agnostic billing.
 * Users have entitlements (what they CAN do), not just tiers.
 */

/**
 * Individual entitlements that can be granted to users.
 * These are the atomic permissions that features check against.
 */
export type EntitlementId =
  // AI Concierge
  | 'ai_queries_basic' // 5/trip (Free)
  | 'ai_queries_extended' // 10/trip (Explorer)
  | 'ai_queries_unlimited' // Unlimited (Frequent Chraveler, Pro)

  // Trip Management
  | 'trips_basic' // 3 trips (Free)
  | 'trips_extended' // 10 trips (Explorer)
  | 'trips_unlimited' // Unlimited (Frequent Chraveler, Pro)
  | 'pro_trip_creation' // Can create Pro trips

  // Storage & Media
  | 'storage_basic' // 500MB (Free)
  | 'storage_extended' // 2GB (Explorer)
  | 'storage_unlimited' // Unlimited (Frequent Chraveler, Pro)

  // Payments
  | 'payments_basic' // 3 splits/trip (Free)
  | 'payments_extended' // 10 splits/trip (Explorer)
  | 'payments_unlimited' // Unlimited (Frequent Chraveler, Pro)

  // Export & Sync
  | 'pdf_export' // PDF itinerary export
  | 'calendar_sync' // External calendar sync

  // Events
  | 'events_create' // Can create events
  | 'events_attendees_50' // Up to 50 attendees
  | 'events_attendees_100' // Up to 100 attendees
  | 'events_attendees_200' // Up to 200 attendees
  | 'events_attendees_unlimited'

  // Pro/Organization Features
  | 'channels_enabled' // Slack-style channels
  | 'roles_enabled' // Role-based permissions
  | 'roster_management' // Team rosters
  | 'logistics_management' // Equipment/venue tracking
  | 'approval_workflows' // Request approval flows
  | 'quickbooks_integration' // Accounting integration
  | 'compliance_audit' // Audit logs
  | 'voice_concierge'; // Gemini Voice in AI Concierge

/**
 * User subscription tiers
 */
export type SubscriptionTier =
  | 'free'
  | 'explorer'
  | 'frequent-chraveler'
  | 'pro-starter'
  | 'pro-growth'
  | 'pro-enterprise';

/**
 * Billing source - where the subscription was purchased
 */
export type BillingSource = 'stripe' | 'apple' | 'google' | 'none';

/**
 * Billing platform
 */
export type BillingPlatform = 'web' | 'ios' | 'android';

/**
 * User's current entitlements
 */
export interface UserEntitlements {
  /** Set of granted entitlements */
  entitlements: Set<EntitlementId>;

  /** Current subscription tier */
  tier: SubscriptionTier;

  /** Where the subscription was purchased */
  source: BillingSource;

  /** When the subscription expires (if applicable) */
  expiresAt?: Date;

  /** Stripe customer ID (if applicable) */
  stripeCustomerId?: string;

  /** Whether user is in trial period */
  isTrialing?: boolean;
}

/**
 * Feature names that can be checked for access
 */
export type FeatureName =
  | 'ai_concierge'
  | 'trip_creation'
  | 'pro_trip_creation'
  | 'media_upload'
  | 'payment_splitting'
  | 'pdf_export'
  | 'calendar_sync'
  | 'event_creation'
  | 'channels'
  | 'roles'
  | 'roster'
  | 'logistics'
  | 'approvals'
  | 'quickbooks'
  | 'audit'
  | 'voice_concierge';

/**
 * Context for feature checks (usage counts, limits, etc.)
 */
export interface FeatureContext {
  tripId?: string;
  usageCount?: number;
  attendeeCount?: number;
}

/**
 * Product information for display
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual?: number;
  currency: string;
  tier: SubscriptionTier;
  entitlements: EntitlementId[];
}

/**
 * Result of a purchase attempt
 */
export interface PurchaseResult {
  success: boolean;
  error?: string;
  errorCode?:
    | 'CANCELLED'
    | 'PAYMENT_FAILED'
    | 'ALREADY_SUBSCRIBED'
    | 'SUBSCRIBE_ON_WEB'
    | 'IAP_NOT_AVAILABLE'
    | 'UNKNOWN';
  entitlements?: UserEntitlements;
  transactionId?: string;
}

/**
 * Purchase request
 */
export type PurchaseType = 'subscription' | 'pass';

export interface PurchaseRequest {
  productId: string;
  tier: SubscriptionTier;
  billingCycle: 'monthly' | 'annual';
  purchaseType?: PurchaseType;
}
