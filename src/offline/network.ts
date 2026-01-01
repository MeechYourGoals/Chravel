import { useEffect, useMemo, useRef, useState } from 'react';
import { getQueueStats } from './queue';
import { processGlobalSyncQueue } from '@/services/globalSyncProcessor';

export type OfflineUiStatus = 'offline' | 'reconnecting' | 'synced';

/**
 * Network + sync status hook for UI.
 *
 * - offline: navigator is offline
 * - reconnecting: online, but queue pending or currently syncing
 * - synced: online, no pending ops (briefly shown after successful sync)
 */
export function useOfflineUiStatus(): {
  status: OfflineUiStatus;
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  recentlySynced: boolean;
  syncNow: () => Promise<void>;
} {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine !== false);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const syncingRef = useRef(false);

  const refreshStats = async (): Promise<void> => {
    const stats = await getQueueStats();
    setPendingCount(stats.pending + stats.syncing);
    setFailedCount(stats.failed);
  };

  const syncNow = async (): Promise<void> => {
    if (navigator.onLine === false) return;
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      // Prefer existing global processor (has full handlers + side effects).
      const result = await processGlobalSyncQueue();
      if (result.processed > 0 || result.failed === 0) {
        setLastSyncedAt(Date.now());
      }
    } finally {
      syncingRef.current = false;
      await refreshStats();
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Kick off a sync quickly after reconnect.
      void syncNow();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refreshStats();
    const id = window.setInterval(() => void refreshStats(), 4000);
    return () => window.clearInterval(id);
  }, []);

  const status: OfflineUiStatus = useMemo(() => {
    if (!isOnline) return 'offline';
    if (pendingCount > 0) return 'reconnecting';
    return 'synced';
  }, [isOnline, pendingCount]);

  const recentlySynced = !!lastSyncedAt && Date.now() - lastSyncedAt < 4000;

  return { status, isOnline, pendingCount, failedCount, recentlySynced, syncNow };
}

