/**
 * Onboarding Hook
 * 
 * Provides access to onboarding state and actions.
 * Initializes on first use.
 */

import { useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';

export const useOnboarding = () => {
  const store = useOnboardingStore();

  // Initialize on mount
  useEffect(() => {
    if (!store.isInitialized) {
      store.init();
    }
  }, [store.isInitialized]);

  return {
    hasCompletedOnboarding: store.hasCompletedOnboarding,
    currentScreen: store.currentScreen,
    isInitialized: store.isInitialized,
    setScreen: store.setScreen,
    completeOnboarding: store.completeOnboarding,
    skipOnboarding: store.skipOnboarding,
    resetOnboarding: store.resetOnboarding,
  };
};
