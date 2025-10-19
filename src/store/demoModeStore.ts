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
    try {
      const enabled = await secureStorageService.isDemoModeEnabled();
      set({ isDemoMode: enabled, isLoading: false });
    } catch (error) {
      console.error('Failed to initialize demo mode:', error);
      set({ isDemoMode: false, isLoading: false });
    }
  },

  enable: async () => {
    try {
      await secureStorageService.setDemoMode(true);
      set({ isDemoMode: true });
    } catch (error) {
      console.error('Failed to enable demo mode:', error);
    }
  },

  disable: async () => {
    try {
      await secureStorageService.setDemoMode(false);
      set({ isDemoMode: false });
    } catch (error) {
      console.error('Failed to disable demo mode:', error);
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
