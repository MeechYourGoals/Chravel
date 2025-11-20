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
      // Try to read from localStorage synchronously first for instant initialization
      const cachedValue = localStorage.getItem('TRIPS_DEMO_MODE');
      console.log('[DemoModeStore] Initializing, localStorage value:', cachedValue);

      if (cachedValue !== null) {
        const isDemoMode = cachedValue === 'true';
        console.log('[DemoModeStore] Using cached value:', isDemoMode);
        set({ isDemoMode, isLoading: false });
        return;
      }

      // Fallback to async service if not in cache
      console.log('[DemoModeStore] No cached value, checking async service...');
      const enabled = await secureStorageService.isDemoModeEnabled();
      console.log('[DemoModeStore] Async service returned:', enabled);
      set({ isDemoMode: enabled, isLoading: false });
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
      console.log('[DemoModeStore] Demo mode enabled successfully');

      // Verify it was set correctly
      const verified = localStorage.getItem('TRIPS_DEMO_MODE');
      if (verified !== 'true') {
        console.error('[DemoModeStore] Verification failed! localStorage value:', verified);
      }
    } catch (error) {
      console.error('[DemoModeStore] Failed to enable demo mode:', error);
    }
  },

  disable: async () => {
    try {
      console.log('[DemoModeStore] Disabling demo mode...');
      await secureStorageService.setDemoMode(false);
      set({ isDemoMode: false });
      console.log('[DemoModeStore] Demo mode disabled successfully');
    } catch (error) {
      console.error('[DemoModeStore] Failed to disable demo mode:', error);
    }
  },

  toggle: async () => {
    const { isDemoMode } = get();
    if (isDemoMode) {
      await get().disable();
    } else {
      await get().enable();
    }
  },
}));
