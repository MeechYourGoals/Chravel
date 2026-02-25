import { create } from 'zustand';
import { secureStorageService } from '@/services/secureStorageService';

export type DemoView = 'off' | 'marketing' | 'app-preview';

interface DemoModeState {
  demoView: DemoView;
  isLoading: boolean;
  isDemoMode: boolean; // Computed property for backwards compatibility
  init: () => void; // ⚡ PERFORMANCE: Now synchronous
  setDemoView: (view: DemoView) => Promise<void>;
  // Legacy methods for backwards compatibility
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  toggle: () => Promise<void>;
}

export const useDemoModeStore = create<DemoModeState>((set, get) => ({
  demoView: 'off',
  isLoading: false,
  isDemoMode: false, // Will be computed

  init: () => {
    // ⚡ PERFORMANCE: Synchronous initialization for instant demo mode detection
    try {
      const cachedValue = localStorage.getItem('TRIPS_DEMO_VIEW');

      if (cachedValue !== null && ['off', 'marketing', 'app-preview'].includes(cachedValue)) {
        const demoView = cachedValue as DemoView;
        set({
          demoView,
          isDemoMode: demoView === 'app-preview',
          isLoading: false,
        });
        return;
      }

      // Fallback to old boolean key for backwards compatibility
      const oldValue = localStorage.getItem('TRIPS_DEMO_MODE');
      if (oldValue !== null) {
        const demoView: DemoView = oldValue === 'true' ? 'app-preview' : 'off';
        localStorage.setItem('TRIPS_DEMO_VIEW', demoView);
        localStorage.removeItem('TRIPS_DEMO_MODE');
        set({
          demoView,
          isDemoMode: demoView === 'app-preview',
          isLoading: false,
        });
        return;
      }

      // No cached value
      set({ demoView: 'off', isDemoMode: false, isLoading: false });
    } catch (error) {
      set({ demoView: 'off', isDemoMode: false, isLoading: false });
    }
  },

  setDemoView: async (view: DemoView) => {
    try {
      localStorage.setItem('TRIPS_DEMO_VIEW', view);
      set({
        demoView: view,
        isDemoMode: view === 'app-preview',
      });
    } catch (error) {
      // Silent fail - non-critical
    }
  },

  // Legacy methods for backwards compatibility
  enable: async () => {
    await get().setDemoView('app-preview');
  },

  disable: async () => {
    await get().setDemoView('off');
  },

  toggle: async () => {
    const { demoView } = get();
    const newView: DemoView = demoView === 'app-preview' ? 'off' : 'app-preview';
    await get().setDemoView(newView);
  },
}));
