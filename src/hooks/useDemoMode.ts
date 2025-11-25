import { useDemoModeStore, DemoView } from '@/store/demoModeStore';
import { demoModeService } from '@/services/demoModeService';
import { useCallback } from 'react';

export const useDemoMode = () => {
  const { demoView, isDemoMode, isLoading, setDemoView, enable, disable, toggle } = useDemoModeStore();

  // Check if any demo content should be shown (marketing or app-preview)
  const showDemoContent = demoView !== 'off';

  const enhancedSetDemoView = useCallback(async (view: DemoView) => {
    const wasAppPreview = demoView === 'app-preview';
    await setDemoView(view);
    
    // Clear session data when turning OFF app preview mode
    if (wasAppPreview && view !== 'app-preview') {
      demoModeService.clearSessionPayments();
      demoModeService.clearSessionPersonalBasecamps();
    }
  }, [demoView, setDemoView]);

  const enhancedToggle = useCallback(async () => {
    const wasEnabled = isDemoMode;
    await toggle();
    
    // Clear session data when turning demo mode OFF
    if (wasEnabled) {
      demoModeService.clearSessionPayments();
      demoModeService.clearSessionPersonalBasecamps();
    }
  }, [isDemoMode, toggle]);

  return {
    demoView,
    isDemoMode,
    showDemoContent,
    isLoading,
    setDemoView: enhancedSetDemoView,
    // Legacy methods for backwards compatibility
    enableDemoMode: enable,
    disableDemoMode: disable,
    toggleDemoMode: enhancedToggle
  };
};
