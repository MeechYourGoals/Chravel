// Feature tier indicators for premium features
export interface FeatureTier {
  emoji: string;
  label: string;
  description: string;
}

export const FEATURE_TIERS: Record<string, FeatureTier> = {
  plus: {
    emoji: '💎',
    label: 'Plus/Pro',
    description: 'Available with Travel Plus Pro subscription'
  },
  enterprise: {
    emoji: '🚀',
    label: 'Enterprise',
    description: 'Available with Enterprise subscription'
  },
  events: {
    emoji: '🌟',
    label: 'Events',
    description: 'Available with Events subscription'
  }
};

// Feature tier mappings for different settings
export const CONSUMER_FEATURE_TIERS: Record<string, string> = {
  'billing': 'plus',
  'travel-wallet': 'plus',
  'calendar-sync': 'plus',
  'connected-accounts': 'plus'
};

export const ENTERPRISE_FEATURE_TIERS: Record<string, string> = {
  'seats': 'enterprise',
  'travel-wallet': 'enterprise',
  'game-schedule': 'enterprise',
  'show-schedule': 'enterprise',
  'notifications': 'enterprise'
};

export const EVENTS_FEATURE_TIERS: Record<string, string> = {
  'ticketing': 'events',
  'live-engagement': 'events',
  'networking': 'events',
  'analytics': 'events',
  'exhibitors': 'events'
};

/**
 * Freemium limits for consumer tiers
 * 
 * AI Query Limits (per user, per trip - NO daily reset):
 * - Free: 5 queries per user per trip
 * - Explorer: 10 queries per user per trip
 * - Frequent Chraveler: Unlimited
 */
export const FREEMIUM_LIMITS = {
  free: {
    aiQueriesPerTrip: 5, // 5 queries per user per trip
    photosPerTrip: 5,
    videosPerTrip: 5,
    filesPerTrip: 5,
    urlsPerTrip: -1, // Unlimited
    storageAccountMB: 500,
    activeTripsLimit: 3, // Max 3 active (non-archived) trips
    paymentRequestsPerTrip: 5, // Max 5 payment requests per trip
    canCreatePayments: true,
    canSettlePayments: true,
    // Taste test: 1 free Pro trip + 1 free Event
    freeProTripsLimit: 1,
    freeEventsLimit: 1,
    eventAttendeesLimit: 50,
    canCreateEvents: true,
  },
  explorer: {
    aiQueriesPerTrip: 10, // 10 queries per user per trip
    photosPerTrip: -1,
    videosPerTrip: -1,
    filesPerTrip: -1,
    urlsPerTrip: -1,
    storageAccountMB: 50000, // 50GB
    activeTripsLimit: -1, // Unlimited
    paymentRequestsPerTrip: -1, // Unlimited
    canCreatePayments: true,
    canSettlePayments: true,
    // Events bundled into Explorer
    canCreateEvents: true,
    eventsLimit: -1, // Unlimited
    eventAttendeesLimit: 100,
  },
  'frequent-chraveler': {
    aiQueriesPerTrip: -1,
    photosPerTrip: -1,
    videosPerTrip: -1,
    filesPerTrip: -1,
    urlsPerTrip: -1,
    storageAccountMB: -1, // Unlimited
    activeTripsLimit: -1, // Unlimited
    paymentRequestsPerTrip: -1, // Unlimited
    canCreatePayments: true,
    canSettlePayments: true,
    canCreateProTrip: true,
    proTripsPerMonth: 1,
    // Events bundled into Frequent Chraveler
    canCreateEvents: true,
    eventsLimit: -1, // Unlimited
    eventAttendeesLimit: 200,
  }
} as const;

// Pro tier limits
export const PRO_LIMITS = {
  'starter': {
    memberLimit: 50,
    canCreateEvents: true,
    eventsLimit: -1, // Unlimited
    eventAttendeesLimit: -1, // Unlimited for Pro
  },
  'growth': {
    memberLimit: 100,
    canCreateEvents: true,
    eventsLimit: -1,
    eventAttendeesLimit: -1,
  },
  'enterprise': {
    memberLimit: 250,
    canCreateEvents: true,
    eventsLimit: -1,
    eventAttendeesLimit: -1,
  }
} as const;

export type FreemiumTier = keyof typeof FREEMIUM_LIMITS;
export type ProTier = keyof typeof PRO_LIMITS;

export const getFreemiumLimits = (tier: FreemiumTier) => {
  return FREEMIUM_LIMITS[tier];
};

export const getProLimits = (tier: ProTier) => {
  return PRO_LIMITS[tier];
};

export const getFeatureTierEmoji = (featureId: string, settingsType: 'consumer' | 'enterprise' | 'events'): string => {
  return '';
};

export const getTierLegend = (): FeatureTier[] => {
  return Object.values(FEATURE_TIERS);
};
