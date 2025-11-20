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
      if (cachedValue !== null) {
        set({ isDemoMode: cachedValue === 'true', isLoading: false });
        return;
      }
      
      // Fallback to async service if not in cache
      const enabled = await secureStorageService.isDemoModeEnabled();
      set({ isDemoMode: enabled, isLoading: false });
    } catch (error) {
      console.error('Failed to initialize demo mode:', error);
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
