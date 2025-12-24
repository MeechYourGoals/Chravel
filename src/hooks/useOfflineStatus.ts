import { useEffect, useState } from 'react';
import { getQueueStats, clearAllQueuedOperations } from '@/offline/queue';
import { processGlobalSyncQueue } from '@/services/globalSyncProcessor';

export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine !== false);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    const refresh = async () => {
      const stats = await getQueueStats();
      setQueueSize(stats.total);
    };

    const handleOnline = () => {
      setIsOnline(true);
      void refresh();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    void refresh();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = window.setInterval(() => void refresh(), 4000);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    queueSize,
    processQueue: async () => {
      if (navigator.onLine === false) return;
      await processGlobalSyncQueue();
      const stats = await getQueueStats();
      setQueueSize(stats.total);
    },
    clearQueue: async () => {
      await clearAllQueuedOperations();
      setQueueSize(0);
    },
  };
};
