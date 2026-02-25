export interface ConsumerSubscription {
  tier:
    | 'free'
    | 'explorer'
    | 'frequent-chraveler'
    | 'pro-starter'
    | 'pro-growth'
    | 'pro-enterprise';
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
  budgetUnit: 'experience' | 'day' | 'person' | 'trip';
  timePreference: 'early-riser' | 'night-owl' | 'flexible';
}

export const BUDGET_UNIT_OPTIONS = [
  { value: 'experience', label: 'Per experience' },
  { value: 'day', label: 'Per day' },
  { value: 'person', label: 'Per person' },
  { value: 'trip', label: 'Per trip' },
] as const;

export interface TripCategory {
  id: string;
  label: string;
  color: string;
}

export const CONSUMER_TRIP_CATEGORIES: TripCategory[] = [
  { id: 'work', label: 'Work', color: 'blue' },
  { id: 'leisure', label: 'Leisure', color: 'green' },
  { id: 'family', label: 'Family', color: 'purple' },
  { id: 'music', label: 'Music', color: 'pink' },
  { id: 'sports', label: 'Sports', color: 'orange' },
  { id: 'vacation', label: 'Vacation', color: 'teal' },
  { id: 'foodie', label: 'Foodie', color: 'yellow' },
  { id: 'adventure', label: 'Adventure', color: 'red' },
  { id: 'wellness', label: 'Wellness', color: 'emerald' },
  { id: 'cultural', label: 'Cultural', color: 'indigo' },
  { id: 'romantic', label: 'Romantic', color: 'rose' },
  { id: 'bachelor-bachelorette', label: 'Bachelor/Bachelorette', color: 'fuchsia' },
  { id: 'reunion', label: 'Reunion', color: 'cyan' },
  { id: 'shopping', label: 'Shopping', color: 'violet' },
  { id: 'nightlife', label: 'Nightlife', color: 'amber' },
];

/**
 * Pro trip categories for UI display.
 *
 * IMPORTANT: IDs here must match ProCategoryEnum values in proCategories.ts.
 * The previous version used kebab-case IDs (business-travel, school-trip, etc.)
 * which did NOT match ProCategoryEnum and caused silent lookup failures.
 */
export const PRO_TRIP_CATEGORIES: TripCategory[] = [
  { id: 'work', label: 'Business Travel', color: 'slate' },
  { id: 'school', label: 'School Trip', color: 'sky' },
  { id: 'productions', label: 'Content / Productions', color: 'lime' },
  { id: 'touring', label: 'Tour', color: 'coral' },
  { id: 'sports', label: 'Sports (Pro/Collegiate)', color: 'orange' },
  { id: 'celebrations', label: 'Celebrations', color: 'fuchsia' },
  { id: 'other', label: 'Other', color: 'gray' },
];

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
  'Vegetarian',
  'Vegan',
  'Halal',
  'Kosher',
  'Gluten-free',
  'Dairy-free',
  'Nut-free',
  'Pescatarian',
  'Keto',
  'No restrictions',
];

export const VIBE_OPTIONS = [
  'Chill',
  'Party',
  'Outdoorsy',
  'Family-friendly',
  'Romantic',
  'Adventure',
  'Cultural',
  'Luxury',
  'Budget-friendly',
  'Nightlife',
  'High Energy',
  'Cozy',
  'Date Night',
  'Good for Groups',
];

export const ACCESSIBILITY_OPTIONS = [
  'Differently Abled Accessible',
  'EV Charging Nearby',
  'Pet Friendly',
  'Family Friendly',
  'Women Owned',
  'LGBTQ+ Friendly',
];

export const BUSINESS_OPTIONS = [
  'Business Appropriate',
  'Corporate',
  'Formal',
  'Chains',
  'Franchises',
];

export const ENTERTAINMENT_OPTIONS = [
  'Live Music',
  'Comedy',
  'Theater',
  'Sports',
  'Art',
  'Historic',
  'Shopping',
  'Tourist Attraction',
  'Landmark',
  'Must-See',
];

export const LIFESTYLE_OPTIONS = [
  'After Hours',
  'Late Night',
  'Early Morning Risers',
  'Locally Owned',
  'Black Owned',
  'Cannabis Friendly',
  'Casual',
  'Fine Dining',
  'Healthy Eats',
  'Brunch',
  'Lounges',
  'Outdoors',
  'Physical Adventure',
  'Sightseeing',
  'Volunteering',
  'Night Owls',
  "Farmer's Markets",
];

// Consumer subscription pricing - NEW 3-TIER STRUCTURE
export const CONSUMER_PRICING = {
  explorer: {
    monthly: 9.99,
    annual: 99,
    trips: Infinity,
    aiQueries: 10, // 10 queries per trip
    savings: 20,
    savingsPercent: 17,
  },
  'frequent-chraveler': {
    monthly: 19.99,
    annual: 199,
    trips: Infinity,
    aiQueries: Infinity, // Unlimited AI
    proTripsPerMonth: 1, // Can create 1 Chravel Pro trip/month
    proTripSeats: 50, // 50-seat allotment for Pro trip
    savings: 40,
    savingsPercent: 17,
  },
} as const;

// Legacy exports for backward compatibility (map to Explorer)
export const TRIPS_PLUS_PRICE = CONSUMER_PRICING.explorer.monthly;
export const TRIPS_PLUS_ANNUAL_PRICE = CONSUMER_PRICING.explorer.annual;

// Storage quotas (in MB)
export const FREE_STORAGE_QUOTA_MB = 500;
export const PLUS_STORAGE_QUOTA_MB = 50000; // 50GB

// Feature availability
export const FEATURE_ACCESS = {
  AI_CONCIERGE: 'free', // 5 queries per trip
  AI_QUERIES_EXPLORER: 10, // 10 queries per trip
  AI_QUERIES_UNLIMITED: 'frequent-chraveler',
  UNLIMITED_STORAGE: 'explorer', // Both paid tiers
  CALENDAR_SYNC: 'frequent-chraveler',
  PDF_EXPORT: 'frequent-chraveler',
  TRIP_CATEGORIES: 'explorer', // Both paid tiers can tag
  PRO_TRIP_ACCESS: 'frequent-chraveler', // 1 Pro trip/month
  PRIORITY_SUPPORT: 'explorer',
  EARLY_ACCESS: 'frequent-chraveler',
} as const;
