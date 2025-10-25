import { useState, useEffect } from 'react';
import { apiHealthCheck, HealthStatus } from '@/services/apiHealthCheck';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to monitor API health status and provide user notifications
 */
export const useApiHealth = () => {
  const [conciergeStatus, setConciergeStatus] = useState<HealthStatus | null>(null);
  const [mapsStatus, setMapsStatus] = useState<HealthStatus | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const initializeHealthChecks = async () => {
      try {
        await apiHealthCheck.initialize();
        
        // Get initial statuses
        const concierge = apiHealthCheck.getHealth('concierge');
        const maps = apiHealthCheck.getHealth('google_maps');
        
        setConciergeStatus(concierge);
        setMapsStatus(maps);
        setIsInitialized(true);

        // Notify user of any offline services
        if (concierge?.status === 'offline') {
          toast({
            title: 'AI Concierge Offline',
            description: 'Attempting to reconnect automatically...',
            variant: 'destructive'
          });
        }

        if (maps?.status === 'offline') {
          toast({
            title: 'Google Maps Offline',
            description: 'Maps functionality may be limited. Reconnecting...',
            variant: 'destructive'
          });
        }

      } catch (error) {
        console.error('Failed to initialize health checks:', error);
      }
    };

    initializeHealthChecks();

    // Poll for status updates every 30 seconds
    const pollInterval = setInterval(() => {
      const concierge = apiHealthCheck.getHealth('concierge');
      const maps = apiHealthCheck.getHealth('google_maps');
      
      // Notify if status changed to healthy
      if (concierge?.status === 'healthy' && conciergeStatus?.status === 'offline') {
        toast({
          title: 'AI Concierge Restored',
          description: 'Connection re-established successfully!',
          variant: 'default'
        });
      }

      if (maps?.status === 'healthy' && mapsStatus?.status === 'offline') {
        toast({
          title: 'Google Maps Restored',
          description: 'Maps are now loading correctly!',
          variant: 'default'
        });
      }

      setConciergeStatus(concierge);
      setMapsStatus(maps);
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      apiHealthCheck.stopPeriodicChecks();
    };
  }, []);

  const forceRecheck = async () => {
    await apiHealthCheck.recheckAll();
    setConciergeStatus(apiHealthCheck.getHealth('concierge'));
    setMapsStatus(apiHealthCheck.getHealth('google_maps'));
  };

  return {
    conciergeStatus,
    mapsStatus,
    isInitialized,
    isAllHealthy: conciergeStatus?.status === 'healthy' && mapsStatus?.status === 'healthy',
    forceRecheck
  };
};
