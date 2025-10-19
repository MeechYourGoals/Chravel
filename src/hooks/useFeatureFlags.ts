import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface FeatureFlags {
  CHANNELS_ENABLED: boolean;
  CHANNELS_PRO_ONLY: boolean;
  CHANNELS_EVENTS_ONLY: boolean;
  CHANNELS_AUTO_CREATE: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  CHANNELS_ENABLED: true,
  CHANNELS_PRO_ONLY: true,
  CHANNELS_EVENTS_ONLY: false,
  CHANNELS_AUTO_CREATE: true,
};

export const useFeatureFlags = () => {
  const { user } = useAuth();
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);

  useEffect(() => {
    // In a real app, you'd fetch these from your feature flag service
    // For now, we'll use environment variables and user roles
    const userRole = (user as any)?.proRole || (user as any)?.role || 'consumer';
    const isProUser = userRole === 'pro' || userRole === 'enterprise_admin' || userRole === 'admin';

    setFlags({
      CHANNELS_ENABLED: true, // Always enabled for now
      CHANNELS_PRO_ONLY: true, // Pro/Enterprise only
      CHANNELS_EVENTS_ONLY: false, // Not events only
      CHANNELS_AUTO_CREATE: true, // Auto-create role channels
    });
  }, [user]);

  const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
    return flags[feature];
  };

  const canUseChannels = (tripType?: 'consumer' | 'pro' | 'event'): boolean => {
    if (!flags.CHANNELS_ENABLED) return false;
    
    if (flags.CHANNELS_PRO_ONLY && tripType === 'consumer') return false;
    if (flags.CHANNELS_EVENTS_ONLY && tripType !== 'event') return false;
    
    return true;
  };

  return {
    flags,
    isFeatureEnabled,
    canUseChannels,
  };
};
