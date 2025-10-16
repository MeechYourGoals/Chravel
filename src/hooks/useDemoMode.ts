import { useDemoModeStore } from '@/store/demoModeStore';
import { demoModeService } from '@/services/demoModeService';
import { useCallback } from 'react';

export const useDemoMode = () => {
  const { isDemoMode, isLoading, enable, disable, toggle } = useDemoModeStore();

  const enhancedToggle = useCallback(() => {
    const wasEnabled = isDemoMode;
    toggle();
    
    // Clear session payments when turning demo mode OFF
    if (wasEnabled) {
      demoModeService.clearSessionPayments();
    }
  }, [isDemoMode, toggle]);

  return {
    isDemoMode,
    isLoading,
    enableDemoMode: enable,
    disableDemoMode: disable,
    toggleDemoMode: enhancedToggle
  };
};