import { useMemo } from 'react';

export const DEFAULT_FEATURES = [
  'chat',
  'calendar',
  'concierge',
  'media',
  'payments',
  'places',
  'polls',
  'tasks'
] as const;

export type FeatureType = typeof DEFAULT_FEATURES[number];

interface FeatureConfig {
  enabled_features?: string[];
  trip_type?: 'consumer' | 'pro' | 'event';
}

export const useFeatureToggle = (config: FeatureConfig) => {
  return useMemo(() => {
    // Consumer trips always have all features enabled
    if (config.trip_type === 'consumer') {
    return {
      showChat: true,
      showCalendar: true,
      showConcierge: true,
      showMedia: true,
      showPayments: true,
      showPlaces: true,
      showPolls: true,
      showTasks: true,
      isFeatureEnabled: () => true
    };
    }

    // For Pro/Event trips, check enabled_features array
    const enabledFeatures = config.enabled_features || DEFAULT_FEATURES;
    
    return {
      showChat: enabledFeatures.includes('chat'),
      showCalendar: enabledFeatures.includes('calendar'),
      showConcierge: enabledFeatures.includes('concierge'),
      showMedia: enabledFeatures.includes('media'),
      showPayments: enabledFeatures.includes('payments'),
      showPlaces: enabledFeatures.includes('places'),
      showPolls: enabledFeatures.includes('polls'),
      showTasks: enabledFeatures.includes('tasks'),
      isFeatureEnabled: (feature: FeatureType) => enabledFeatures.includes(feature)
    };
  }, [config.enabled_features, config.trip_type]);
};