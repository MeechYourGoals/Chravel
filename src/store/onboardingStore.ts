/**
 * Onboarding Store
 * 
 * Manages onboarding completion state with localStorage persistence
 * for unauthenticated users, and Supabase user_metadata for authenticated.
 */

import { create } from 'zustand';

const STORAGE_KEY = 'chravel_onboarding_completed';

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  currentScreen: number;
  isInitialized: boolean;
  
  // Actions
  init: () => void;
  setScreen: (screen: number) => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void; // For testing
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  hasCompletedOnboarding: false,
  currentScreen: 0,
  isInitialized: false,

  init: () => {
    // Check localStorage for unauthenticated users
    const stored = localStorage.getItem(STORAGE_KEY);
    const completed = stored === 'true';
    
    set({ 
      hasCompletedOnboarding: completed,
      isInitialized: true 
    });
  },

  setScreen: (screen: number) => {
    set({ currentScreen: screen });
  },

  completeOnboarding: () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    set({ hasCompletedOnboarding: true });
  },

  skipOnboarding: () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    set({ hasCompletedOnboarding: true });
  },

  resetOnboarding: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ 
      hasCompletedOnboarding: false, 
      currentScreen: 0 
    });
  },
}));
