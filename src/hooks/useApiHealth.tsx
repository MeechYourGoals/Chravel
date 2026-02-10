import { useState, useEffect } from 'react';
import { apiHealthCheck, HealthStatus } from '@/services/apiHealthCheck';


/**
 * Hook to monitor API health status and provide user notifications
 * @param enabled - Whether to actually run health checks (false in demo mode)
 */
export const useApiHealth = (enabled: boolean = true) => {
  const [conciergeStatus, setConciergeStatus] = useState<HealthStatus | null>(null);
  const [mapsStatus, setMapsStatus] = useState<HealthStatus | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  

  useEffect(() => {
    // Skip health checks if disabled (demo mode or unauthenticated)
    if (!enabled) {
      setIsInitialized(true);
      return;
    }

    const initializeHealthChecks = async () => {
      try {
        await apiHealthCheck.initialize();
        
        // Get initial statuses
        const concierge = apiHealthCheck.getHealth('concierge');
        const maps = apiHealthCheck.getHealth('google_maps');
        
      setConciergeStatus(concierge);
      setMapsStatus(maps);
      setIsInitialized(true);

      } catch (error) {
        console.error('Failed to initialize health checks:', error);
      }
    };

    initializeHealthChecks();

    // Poll for status updates every 30 seconds
    const pollInterval = setInterval(() => {
      try {
        const concierge = apiHealthCheck.getHealth('concierge');
        const maps = apiHealthCheck.getHealth('google_maps');

        setConciergeStatus(concierge);
        setMapsStatus(maps);
      } catch (error) {
        console.error('Error polling health status:', error);
      }
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      apiHealthCheck.stopPeriodicChecks();
    };
  }, [enabled]);

  const forceRecheck = async () => {
    try {
      await apiHealthCheck.recheckAll();
      setConciergeStatus(apiHealthCheck.getHealth('concierge'));
      setMapsStatus(apiHealthCheck.getHealth('google_maps'));
    } catch (error) {
      console.error('Error forcing health recheck:', error);
    }
  };

  return {
    conciergeStatus,
    mapsStatus,
    isInitialized,
    isAllHealthy: conciergeStatus?.status === 'healthy' && mapsStatus?.status === 'healthy',
    forceRecheck
  };
};
