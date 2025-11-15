/**
 * Service Worker Sync Utilities
 * 
 * Registers background sync for offline operations
 */

/**
 * Register a background sync for a specific entity type
 */
export async function registerBackgroundSync(entityType: 'chat_message' | 'task' | 'calendar_event' | 'all'): Promise<void> {
  if (!('serviceWorker' in navigator) || !('sync' in (self as any).registration)) {
    console.warn('[Sync] Background sync not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const syncTag = `chravel-sync-${entityType}`;

    await (registration as any).sync.register(syncTag);
  } catch (error) {
    console.error('[Sync] Failed to register background sync:', error);
  }
}

/**
 * Trigger immediate sync via service worker message
 */
export async function triggerSync(entityType: 'chat_message' | 'task' | 'calendar_event' | 'all'): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Sync] Service Worker not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (registration.active) {
      registration.active.postMessage({
        type: 'TRIGGER_SYNC',
        entityType,
      });
    }
  } catch (error) {
    console.error('[Sync] Failed to trigger sync:', error);
  }
}

/**
 * Check if background sync is supported
 */
export function isBackgroundSyncSupported(): boolean {
  return 'serviceWorker' in navigator && 'sync' in (self as any).registration;
}
