import { useState, useCallback } from 'react';

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  broadcastsEnabled: boolean;
  messagesEnabled: boolean;
  tasksEnabled: boolean;
  paymentsEnabled: boolean;
  eventsEnabled: boolean;
  dndMode: boolean;
  dndStart?: string; // HH:mm format
  dndEnd?: string; // HH:mm format
  frequency: 'instant' | 'hourly' | 'daily';
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  inAppEnabled: true,
  broadcastsEnabled: true,
  messagesEnabled: true,
  tasksEnabled: true,
  paymentsEnabled: true,
  eventsEnabled: true,
  dndMode: false,
  frequency: 'instant'
};

export const useNotificationPreferences = (initialPreferences?: Partial<NotificationPreferences>) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    ...DEFAULT_PREFERENCES,
    ...initialPreferences
  });

  const togglePreference = useCallback(<K extends keyof NotificationPreferences>(
    key: K,
    value?: NotificationPreferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value !== undefined ? value : !prev[key]
    }));
  }, []);

  const togglePush = useCallback(() => {
    togglePreference('pushEnabled');
  }, [togglePreference]);

  const toggleEmail = useCallback(() => {
    togglePreference('emailEnabled');
  }, [togglePreference]);

  const toggleSMS = useCallback(() => {
    togglePreference('smsEnabled');
  }, [togglePreference]);

  const setFrequency = useCallback((frequency: NotificationPreferences['frequency']) => {
    setPreferences(prev => ({ ...prev, frequency }));
  }, []);

  const enableDND = useCallback((enabled: boolean, start?: string, end?: string) => {
    setPreferences(prev => ({
      ...prev,
      dndMode: enabled,
      dndStart: start || prev.dndStart,
      dndEnd: end || prev.dndEnd
    }));
  }, []);

  const toggleCategory = useCallback((category: 'broadcasts' | 'messages' | 'tasks' | 'payments' | 'events') => {
    const key = `${category}Enabled` as keyof NotificationPreferences;
    togglePreference(key);
  }, [togglePreference]);

  const enableAll = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      pushEnabled: true,
      emailEnabled: true,
      inAppEnabled: true,
      broadcastsEnabled: true,
      messagesEnabled: true,
      tasksEnabled: true,
      paymentsEnabled: true,
      eventsEnabled: true
    }));
  }, []);

  const disableAll = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      pushEnabled: false,
      emailEnabled: false,
      smsEnabled: false,
      inAppEnabled: false,
      broadcastsEnabled: false,
      messagesEnabled: false,
      tasksEnabled: false,
      paymentsEnabled: false,
      eventsEnabled: false
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const validateDNDTimes = useCallback((start?: string, end?: string): { 
    isValid: boolean; 
    error?: string 
  } => {
    if (!start || !end) {
      return { isValid: false, error: 'Both start and end times are required for DND mode' };
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start) || !timeRegex.test(end)) {
      return { isValid: false, error: 'Invalid time format. Use HH:mm format' };
    }

    return { isValid: true };
  }, []);

  return {
    // State
    preferences,
    
    // Computed
    isAnyEnabled: preferences.pushEnabled || preferences.emailEnabled || preferences.smsEnabled || preferences.inAppEnabled,
    areAllDisabled: !preferences.pushEnabled && !preferences.emailEnabled && !preferences.smsEnabled && !preferences.inAppEnabled,
    
    // Actions
    togglePreference,
    togglePush,
    toggleEmail,
    toggleSMS,
    toggleCategory,
    setFrequency,
    enableDND,
    enableAll,
    disableAll,
    resetToDefaults,
    validateDNDTimes,
    setPreferences
  };
};
