
export interface ConsumerSubscription {
  tier: 'free' | 'explorer' | 'pro';
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  storageUsedMB?: number;
  storageQuotaMB?: number;
}

export interface StorageQuota {
  usedMB: number;
  quotaMB: number;
  percentUsed: number;
  isNearLimit: boolean; // 80%+
  isOverLimit: boolean;
}

export interface TripPreferences {
  dietary: string[];
  vibe: string[];
  accessibility: string[];
  business: string[];
  entertainment: string[];
  lifestyle: string[];
  budgetMin: number;
  budgetMax: number;
  timePreference: 'early-riser' | 'night-owl' | 'flexible';
}

export interface AIRecommendation {
  id: string;
  type: 'restaurant' | 'activity' | 'accommodation' | 'transportation';
  title: string;
  description: string;
  location: string;
  rating?: number;
  priceRange?: string;
  matchedPreferences: string[];
}

export const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free', 
  'Dairy-free', 'Nut-free', 'Pescatarian', 'Keto', 'No restrictions'
];

export const VIBE_OPTIONS = [
  'Chill', 'Party', 'Outdoorsy', 'Family-friendly', 'Romantic', 
  'Adventure', 'Cultural', 'Luxury', 'Budget-friendly', 'Nightlife',
  'High Energy', 'Cozy', 'Date Night', 'Good for Groups'
];

export const ACCESSIBILITY_OPTIONS = [
  'Differently Abled Accessible', 'EV Charging Nearby', 'Pet Friendly',
  'Family Friendly', 'Women Owned', 'LGBTQ+ Friendly'
];

export const BUSINESS_OPTIONS = [
  'Business Appropriate', 'Corporate', 'Formal', 'Chains', 'Franchises'
];

export const ENTERTAINMENT_OPTIONS = [
  'Live Music', 'Comedy', 'Theater', 'Sports', 'Art', 'Historic',
  'Shopping', 'Tourist Attraction', 'Landmark', 'Must-See'
];

export const LIFESTYLE_OPTIONS = [
  'After Hours', 'Late Night', 'Early Morning Risers', 'Locally Owned',
  'Black Owned', 'Cannabis Friendly', 'Casual', 'Fine Dining',
  'Healthy Eats', 'Brunch', 'Lounges', 'Outdoors', 'Physical Adventure',
  'Sightseeing', 'Volunteering', 'Night Owls', 'Farmer\'s Markets'
];

// Consumer subscription pricing - NEW 3-TIER STRUCTURE
export const CONSUMER_PRICING = {
  explorer: {
    monthly: 9.99,
    annual: 99,
    trips: Infinity,
    savings: 20,
    savingsPercent: 17
  },
  pro: {
    monthly: 19.99,
    annual: 199,
    trips: Infinity,
    savings: 40,
    savingsPercent: 17
  }
} as const;

// Legacy exports for backward compatibility (map to Explorer)
export const TRIPS_PLUS_PRICE = CONSUMER_PRICING.explorer.monthly;
export const TRIPS_PLUS_ANNUAL_PRICE = CONSUMER_PRICING.explorer.annual;

// Storage quotas (in MB)
export const FREE_STORAGE_QUOTA_MB = 500;
export const PLUS_STORAGE_QUOTA_MB = 50000; // 50GB

// Feature availability
export const FEATURE_ACCESS = {
  AI_CONCIERGE: 'free', // Now free for all users
  UNLIMITED_STORAGE: 'plus',
  ADVANCED_ANALYTICS: 'plus',
  PRIORITY_SUPPORT: 'plus',
  TEAM_MANAGEMENT: 'plus'
} as const;
