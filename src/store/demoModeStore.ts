import { create } from 'zustand';
import { secureStorageService } from '@/services/secureStorageService';

export type DemoView = 'off' | 'marketing' | 'app-preview';

interface DemoModeState {
  demoView: DemoView;
  isLoading: boolean;
  isDemoMode: boolean; // Computed property for backwards compatibility
  init: () => Promise<void>;
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

  init: async () => {
    set({ isLoading: true });
    try {
      // Try to read from localStorage synchronously first for instant initialization
      const cachedValue = localStorage.getItem('TRIPS_DEMO_VIEW');
      console.log('[DemoModeStore] Initializing, localStorage value:', cachedValue);

      if (cachedValue !== null && ['off', 'marketing', 'app-preview'].includes(cachedValue)) {
        const demoView = cachedValue as DemoView;
        console.log('[DemoModeStore] Using cached value:', demoView);
        set({ 
          demoView, 
          isDemoMode: demoView === 'app-preview',
          isLoading: false 
        });
        return;
      }

      // Fallback to old boolean key for backwards compatibility
      const oldValue = localStorage.getItem('TRIPS_DEMO_MODE');
      if (oldValue !== null) {
        const demoView: DemoView = oldValue === 'true' ? 'app-preview' : 'off';
        console.log('[DemoModeStore] Migrating from old boolean value:', demoView);
        localStorage.setItem('TRIPS_DEMO_VIEW', demoView);
        localStorage.removeItem('TRIPS_DEMO_MODE');
        set({ 
          demoView, 
          isDemoMode: demoView === 'app-preview',
          isLoading: false 
        });
        return;
      }

      // No cached value
      console.log('[DemoModeStore] No cached value, defaulting to OFF');
      set({ demoView: 'off', isDemoMode: false, isLoading: false });
    } catch (error) {
      console.error('[DemoModeStore] Failed to initialize demo mode:', error);
      set({ demoView: 'off', isDemoMode: false, isLoading: false });
    }
  },

  setDemoView: async (view: DemoView) => {
    try {
      console.log('[DemoModeStore] Setting demo view to:', view);
      localStorage.setItem('TRIPS_DEMO_VIEW', view);
      set({ 
        demoView: view,
        isDemoMode: view === 'app-preview'
      });
      console.log('[DemoModeStore] Demo view set successfully');

      // Verify it was set correctly
      const verified = localStorage.getItem('TRIPS_DEMO_VIEW');
      if (verified !== view) {
        console.error('[DemoModeStore] Verification failed! localStorage value:', verified);
      }
    } catch (error) {
      console.error('[DemoModeStore] Failed to set demo view:', error);
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
