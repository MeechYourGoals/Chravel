/**
 * Onboarding Store
 *
 * Manages onboarding completion state with:
 * - Supabase user_metadata as the source of truth (for authenticated users)
 * - localStorage as a performance cache
 *
 * The flag `has_seen_onboarding` is persisted in Supabase user_metadata
 * to ensure users never see onboarding twice, even across devices/browsers.
 */

import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

const LOCAL_STORAGE_KEY = 'chravel_onboarding_completed';
const PENDING_DESTINATION_KEY = 'chravel_onboarding_pending_destination';

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  currentScreen: number;
  isInitialized: boolean;
  pendingDestination: string | null;

  // Actions
  init: () => void;
  initWithUser: (userId: string) => Promise<void>;
  setScreen: (screen: number) => void;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  resetOnboarding: () => void; // For testing
  setPendingDestination: (destination: string | null) => void;
  getPendingDestination: () => string | null;
  clearPendingDestination: () => void;
}

/**
 * Sync onboarding completion to Supabase user_metadata.
 * This ensures the flag persists across devices/browsers.
 */
async function syncToSupabase(): Promise<void> {
  try {
    const { error } = await supabase.auth.updateUser({
      data: { has_seen_onboarding: true },
    });
    if (error) {
      console.warn('[Onboarding] Failed to sync to Supabase:', error.message);
    }
  } catch (err) {
    console.warn('[Onboarding] Error syncing to Supabase:', err);
  }
}

/**
 * Check Supabase user_metadata for onboarding completion status.
 * Returns true if user has already completed onboarding.
 */
async function checkSupabaseOnboardingStatus(): Promise<boolean> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return false;

    return user.user_metadata?.has_seen_onboarding === true;
  } catch (err) {
    console.warn('[Onboarding] Error checking Supabase status:', err);
    return false;
  }
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  hasCompletedOnboarding: false,
  currentScreen: 0,
  isInitialized: false,
  pendingDestination: null,

  /**
   * Initialize for unauthenticated users (localStorage only).
   * For authenticated users, use initWithUser instead.
   */
  init: () => {
    // Check localStorage first (fast cache)
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    const completed = stored === 'true';

    // Check for pending destination
    const pendingDest = sessionStorage.getItem(PENDING_DESTINATION_KEY);

    set({
      hasCompletedOnboarding: completed,
      isInitialized: true,
      pendingDestination: pendingDest,
    });
  },

  /**
   * Initialize for authenticated users.
   * Checks Supabase user_metadata as source of truth, with localStorage cache.
   */
  initWithUser: async (userId: string) => {
    // First check localStorage for fast UI response
    const localStored = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localCompleted = localStored === 'true';

    // Check for pending destination
    const pendingDest = sessionStorage.getItem(PENDING_DESTINATION_KEY);

    // Set initial state from localStorage (fast path)
    set({
      hasCompletedOnboarding: localCompleted,
      isInitialized: true,
      pendingDestination: pendingDest,
    });

    // Then verify with Supabase (authoritative source)
    const supabaseCompleted = await checkSupabaseOnboardingStatus();

    if (supabaseCompleted && !localCompleted) {
      // Supabase says completed but localStorage doesn't - sync localStorage
      localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
      set({ hasCompletedOnboarding: true });
    } else if (!supabaseCompleted && localCompleted) {
      // localStorage says completed but Supabase doesn't - sync to Supabase
      await syncToSupabase();
    }
  },

  setScreen: (screen: number) => {
    set({ currentScreen: screen });
  },

  /**
   * Mark onboarding as complete.
   * Persists to both localStorage (cache) and Supabase (source of truth).
   */
  completeOnboarding: async () => {
    // Update localStorage immediately (fast)
    localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
    set({ hasCompletedOnboarding: true });

    // Sync to Supabase (async, don't block)
    syncToSupabase();
  },

  /**
   * Skip onboarding (same as completing it).
   */
  skipOnboarding: async () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
    set({ hasCompletedOnboarding: true });
    syncToSupabase();
  },

  /**
   * Reset onboarding state (for testing/debugging only).
   */
  resetOnboarding: () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    sessionStorage.removeItem(PENDING_DESTINATION_KEY);
    set({
      hasCompletedOnboarding: false,
      currentScreen: 0,
      pendingDestination: null,
    });
  },

  /**
   * Set a destination to navigate to after onboarding completes.
   * Used for deep links like invite codes, trip shares, etc.
   */
  setPendingDestination: (destination: string | null) => {
    if (destination) {
      sessionStorage.setItem(PENDING_DESTINATION_KEY, destination);
    } else {
      sessionStorage.removeItem(PENDING_DESTINATION_KEY);
    }
    set({ pendingDestination: destination });
  },

  /**
   * Get the pending destination (if any).
   */
  getPendingDestination: () => {
    return get().pendingDestination || sessionStorage.getItem(PENDING_DESTINATION_KEY);
  },

  /**
   * Clear the pending destination after navigation.
   */
  clearPendingDestination: () => {
    sessionStorage.removeItem(PENDING_DESTINATION_KEY);
    set({ pendingDestination: null });
  },
}));
