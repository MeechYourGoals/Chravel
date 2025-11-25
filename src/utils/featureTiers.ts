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

// Freemium limits for consumer tiers
export const FREEMIUM_LIMITS = {
  free: {
    aiQueriesPerTrip: 10,
    photosPerTrip: 5,
    videosPerTrip: 5,
    filesPerTrip: 5,
    urlsPerTrip: -1, // Unlimited
    storageAccountMB: 500,
    canCreatePayments: false,
    canSettlePayments: false,
  },
  explorer: {
    aiQueriesPerTrip: -1, // Unlimited
    photosPerTrip: -1,
    videosPerTrip: -1,
    filesPerTrip: -1,
    urlsPerTrip: -1,
    storageAccountMB: 50000, // 50GB
    canCreatePayments: true,
    canSettlePayments: true,
  },
  'frequent-chraveler': {
    aiQueriesPerTrip: -1,
    photosPerTrip: -1,
    videosPerTrip: -1,
    filesPerTrip: -1,
    urlsPerTrip: -1,
    storageAccountMB: -1, // Unlimited
    canCreatePayments: true,
    canSettlePayments: true,
    canCreateProTrip: true,
  }
} as const;

export type FreemiumTier = keyof typeof FREEMIUM_LIMITS;

export const getFreemiumLimits = (tier: FreemiumTier) => {
  return FREEMIUM_LIMITS[tier];
};

export const getFeatureTierEmoji = (featureId: string, settingsType: 'consumer' | 'enterprise' | 'events'): string => {
  return '';
};

export const getTierLegend = (): FeatureTier[] => {
  return Object.values(FEATURE_TIERS);
};