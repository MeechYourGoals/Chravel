import { useMemo } from 'react';

// Pro trip features
export const PRO_FEATURES = [
  'chat',
  'calendar',
  'concierge',
  'media',
  'payments',
  'places',
  'polls',
  'tasks'
] as const;

// Event features (matching actual event tabs)
export const EVENT_FEATURES = [
  'agenda',
  'calendar',
  'chat',
  'media',
  'lineup',
  'polls',
  'tasks'
] as const;

// Default features (for backward compatibility)
export const DEFAULT_FEATURES = PRO_FEATURES;

export type FeatureType = typeof PRO_FEATURES[number] | typeof EVENT_FEATURES[number];

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
      showAgenda: false,
      showLineup: false,
      isFeatureEnabled: () => true
    };
    }

    // For Pro/Event trips, check enabled_features array
    const defaultFeatures = config.trip_type === 'event' ? EVENT_FEATURES : PRO_FEATURES;
    const enabledFeatures = config.enabled_features || defaultFeatures;

    return {
      showChat: enabledFeatures.includes('chat'),
      showCalendar: enabledFeatures.includes('calendar'),
      showConcierge: enabledFeatures.includes('concierge'),
      showMedia: enabledFeatures.includes('media'),
      showPayments: enabledFeatures.includes('payments'),
      showPlaces: enabledFeatures.includes('places'),
      showPolls: enabledFeatures.includes('polls'),
      showTasks: enabledFeatures.includes('tasks'),
      showAgenda: enabledFeatures.includes('agenda'),
      showLineup: enabledFeatures.includes('lineup'),
      isFeatureEnabled: (feature: FeatureType) => enabledFeatures.includes(feature)
    };
  }, [config.enabled_features, config.trip_type]);
};