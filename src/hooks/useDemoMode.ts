import { useDemoModeStore, DemoView } from '@/store/demoModeStore';
import { demoModeService } from '@/services/demoModeService';
import { useCallback } from 'react';

// Stable selector functions - defined outside component to prevent reference changes
const selectDemoView = (state: { demoView: DemoView }) => state.demoView;
const selectIsDemoMode = (state: { isDemoMode: boolean }) => state.isDemoMode;
const selectIsLoading = (state: { isLoading: boolean }) => state.isLoading;

export const useDemoMode = () => {
  // Subscribe to individual state slices - NOT the entire store
  const demoView = useDemoModeStore(selectDemoView);
  const isDemoMode = useDemoModeStore(selectIsDemoMode);
  const isLoading = useDemoModeStore(selectIsLoading);

  // Check if any demo content should be shown (marketing or app-preview)
  const showDemoContent = demoView !== 'off';

  const enhancedSetDemoView = useCallback(async (view: DemoView) => {
    const wasAppPreview = demoView === 'app-preview';
    // Get action from store state to avoid subscription
    await useDemoModeStore.getState().setDemoView(view);
    
    // Clear session data when turning OFF app preview mode
    if (wasAppPreview && view !== 'app-preview') {
      demoModeService.clearSessionPayments();
      demoModeService.clearSessionPersonalBasecamps();
    }
  }, [demoView]);

  const enhancedToggle = useCallback(async () => {
    const wasEnabled = isDemoMode;
    // Get action from store state to avoid subscription
    await useDemoModeStore.getState().toggle();
    
    // Clear session data when turning demo mode OFF
    if (wasEnabled) {
      demoModeService.clearSessionPayments();
      demoModeService.clearSessionPersonalBasecamps();
    }
  }, [isDemoMode]);

  return {
    demoView,
    isDemoMode,
    showDemoContent,
    isLoading,
    setDemoView: enhancedSetDemoView,
    // Legacy methods - get from store state to avoid subscriptions
    enableDemoMode: useDemoModeStore.getState().enable,
    disableDemoMode: useDemoModeStore.getState().disable,
    toggleDemoMode: enhancedToggle
  };
};
