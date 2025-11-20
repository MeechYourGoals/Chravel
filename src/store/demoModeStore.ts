import { create } from 'zustand';
import { secureStorageService } from '@/services/secureStorageService';

interface DemoModeState {
  isDemoMode: boolean;
  isLoading: boolean;
  init: () => Promise<void>;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  toggle: () => Promise<void>;
}

export const useDemoModeStore = create<DemoModeState>((set, get) => ({
  isDemoMode: false,
  isLoading: false,

  init: async () => {
    set({ isLoading: true });
    try {
      // 🎯 FIX: Validate localStorage cache before trusting it
      const cachedValue = localStorage.getItem('TRIPS_DEMO_MODE');
      if (cachedValue !== null) {
        // Validate the cached value is actually a boolean string
        if (cachedValue === 'true' || cachedValue === 'false') {
          const isDemoEnabled = cachedValue === 'true';
          set({ isDemoMode: isDemoEnabled, isLoading: false });
          console.log('[DemoModeStore] Initialized from cache:', { isDemoMode: isDemoEnabled });
          return;
        } else {
          // Clear corrupted cache
          console.warn('[DemoModeStore] Corrupted cache value detected, clearing:', cachedValue);
          localStorage.removeItem('TRIPS_DEMO_MODE');
        }
      }

      // Fallback to async service if not in cache or cache was corrupted
      const enabled = await secureStorageService.isDemoModeEnabled();
      set({ isDemoMode: enabled, isLoading: false });
      console.log('[DemoModeStore] Initialized from service:', { isDemoMode: enabled });
    } catch (error) {
      console.error('[DemoModeStore] Failed to initialize demo mode:', error);
      set({ isDemoMode: false, isLoading: false });
    }
  },

  enable: async () => {
    try {
      console.log('[DemoModeStore] Enabling demo mode...');
      await secureStorageService.setDemoMode(true);
      set({ isDemoMode: true });
      console.log('[DemoModeStore] ✅ Demo mode enabled');
    } catch (error) {
      console.error('[DemoModeStore] ❌ Failed to enable demo mode:', error);
    }
  },

  disable: async () => {
    try {
      console.log('[DemoModeStore] Disabling demo mode...');
      await secureStorageService.setDemoMode(false);
      set({ isDemoMode: false });
      console.log('[DemoModeStore] ✅ Demo mode disabled');
    } catch (error) {
      console.error('[DemoModeStore] ❌ Failed to disable demo mode:', error);
    }
  },

  toggle: async () => {
    const { isDemoMode } = get();
    console.log('[DemoModeStore] Toggle called, current state:', isDemoMode);
    if (isDemoMode) {
      await get().disable();
    } else {
      await get().enable();
    }
  },
}));
