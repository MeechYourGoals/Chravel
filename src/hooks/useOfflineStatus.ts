import { useState, useEffect } from 'react';
import { offlineService } from '@/services/offlineService';

export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(offlineService.getIsOnline());
  const [queueSize, setQueueSize] = useState(offlineService.getQueueSize());

  useEffect(() => {
    // Subscribe to online/offline changes
    const unsubscribe = offlineService.subscribe((online) => {
      setIsOnline(online);
      setQueueSize(offlineService.getQueueSize());
    });

    // Update queue size periodically
    const interval = setInterval(() => {
      setQueueSize(offlineService.getQueueSize());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    queueSize,
    processQueue: () => offlineService.processQueue(),
    clearQueue: () => offlineService.clearQueue(),
  };
};
