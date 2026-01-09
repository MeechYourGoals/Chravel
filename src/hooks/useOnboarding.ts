/**
 * Onboarding Hook
 *
 * Provides access to onboarding state and actions.
 * Initializes on first use, with Supabase sync for authenticated users.
 */

import { useEffect, useCallback } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';

interface UseOnboardingOptions {
  userId?: string | null;
  isDemoMode?: boolean;
}

export const useOnboarding = (options: UseOnboardingOptions = {}) => {
  const { userId, isDemoMode = false } = options;
  const store = useOnboardingStore();

  // Initialize on mount with appropriate method based on auth state
  // CRITICAL: Re-initialize when userId changes to handle account switches
  useEffect(() => {
    // Demo mode: don't persist onboarding state
    if (isDemoMode) {
      store.init();
      return;
    }

    // Authenticated user: use Supabase sync
    // initWithUser handles checking if re-init is actually needed
    if (userId) {
      store.initWithUser(userId);
    } else {
      // Unauthenticated: use localStorage only
      store.init();
    }
  }, [userId, isDemoMode]); // Removed store.isInitialized - let initWithUser decide

  // Callback to complete onboarding and navigate to pending destination
  const completeAndNavigate = useCallback(
    async (navigate: (path: string, options?: { replace?: boolean }) => void) => {
      await store.completeOnboarding();

      const pendingDest = store.getPendingDestination();
      if (pendingDest) {
        store.clearPendingDestination();
        navigate(pendingDest, { replace: true });
        return true;
      }
      return false;
    },
    [],
  );

  return {
    hasCompletedOnboarding: store.hasCompletedOnboarding,
    currentScreen: store.currentScreen,
    isInitialized: store.isInitialized,
    pendingDestination: store.pendingDestination,
    setScreen: store.setScreen,
    completeOnboarding: store.completeOnboarding,
    skipOnboarding: store.skipOnboarding,
    resetOnboarding: store.resetOnboarding,
    setPendingDestination: store.setPendingDestination,
    getPendingDestination: store.getPendingDestination,
    clearPendingDestination: store.clearPendingDestination,
    completeAndNavigate,
  };
};
