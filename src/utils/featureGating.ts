/**
 * Feature Gating Utility
 * 
 * Controls which features are available in demo mode vs authenticated mode.
 * Used to show "Coming Soon" states for features not yet ready for production.
 */

export type FeatureName = 
  | 'chravel-recs' 
  | 'events-module'
  | 'pro-trips'
  | 'ai-concierge'
  | 'payments'
  | 'stripe-billing';

interface FeatureAvailability {
  demoMode: boolean;
  authenticated: boolean;
  comingSoonMessage?: string;
}

const featureMatrix: Record<FeatureName, FeatureAvailability> = {
  'chravel-recs': {
    demoMode: true,
    authenticated: false,
    comingSoonMessage: 'ChravelApp Recommendations are coming soon for authenticated users!'
  },
  'events-module': {
    demoMode: true,
    authenticated: true,  // ✅ ENABLED for authenticated users
  },
  'pro-trips': {
    demoMode: true,
    authenticated: true,  // ✅ ENABLED for authenticated users
  },
  'ai-concierge': {
    demoMode: true,
    authenticated: true, // AI Concierge works in both modes
  },
  'payments': {
    demoMode: true,
    authenticated: true, // Payments work in both modes
  },
  'stripe-billing': {
    demoMode: false, // Billing only for real users
    authenticated: true,
  }
};

/**
 * Check if a feature is available in the current mode
 * @param feature - The feature to check
 * @param isDemoMode - Whether demo mode is active
 * @param user - The authenticated user (null if not logged in)
 * @returns true if feature is available, false otherwise
 */
export const isFeatureAvailable = (
  feature: FeatureName,
  isDemoMode: boolean,
  user: any
): boolean => {
  const availability = featureMatrix[feature];
  
  if (!availability) {
    console.warn(`Unknown feature: ${feature}`);
    return false;
  }

  // Demo mode: check demo availability
  if (isDemoMode) {
    return availability.demoMode;
  }

  // Authenticated mode: check auth availability and user presence
  if (user) {
    return availability.authenticated;
  }

  // Not logged in and not in demo mode: no features available
  return false;
};

/**
 * Get the "Coming Soon" message for a feature if it's unavailable
 * @param feature - The feature to check
 * @returns Coming soon message or null if feature is available
 */
export const getComingSoonMessage = (feature: FeatureName): string | null => {
  return featureMatrix[feature]?.comingSoonMessage || null;
};

/**
 * Check if any features are gated in the current mode
 * Useful for showing banners or tooltips
 */
export const hasGatedFeatures = (isDemoMode: boolean, user: any): boolean => {
  const gatedFeatures: FeatureName[] = ['events-module', 'pro-trips', 'chravel-recs'];
  
  return gatedFeatures.some(feature => !isFeatureAvailable(feature, isDemoMode, user));
};
