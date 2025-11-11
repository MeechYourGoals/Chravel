/**
 * Service Worker for Background Sync
 * 
 * Handles background synchronization of offline operations when connection is restored
 * Supports chat messages, tasks, and calendar events
 */

const CACHE_NAME = 'chravel-offline-sync-v1';
const SYNC_TAG_PREFIX = 'chravel-sync';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

// Background sync event - process queued operations
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag.startsWith(SYNC_TAG_PREFIX)) {
    event.waitUntil(processSyncQueue(event.tag));
  }
});

/**
 * Process sync queue for a specific entity type
 */
async function processSyncQueue(syncTag: string) {
  try {
    // Extract entity type from tag (format: chravel-sync-{entityType})
    const entityType = syncTag.replace(`${SYNC_TAG_PREFIX}-`, '');

    console.log(`[SW] Processing sync queue for: ${entityType}`);

    // Open IndexedDB to get queued operations
    const db = await openIndexedDB();
    const operations = await getQueuedOperations(db, entityType);

    if (operations.length === 0) {
      console.log(`[SW] No operations to sync for ${entityType}`);
      return;
    }

    console.log(`[SW] Found ${operations.length} operations to sync`);

    // Process each operation
    for (const operation of operations) {
      try {
        await syncOperation(operation);
        await removeOperation(db, operation.id);
        console.log(`[SW] Successfully synced operation ${operation.id}`);
      } catch (error) {
        console.error(`[SW] Failed to sync operation ${operation.id}:`, error);
        await incrementRetry(db, operation.id);
      }
    }
  } catch (error) {
    console.error('[SW] Error processing sync queue:', error);
  }
}

/**
 * Open IndexedDB connection
 */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('chravel-offline-sync', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
        store.createIndex('by-status', 'status');
        store.createIndex('by-timestamp', 'timestamp');
        store.createIndex('by-trip', 'tripId');
        store.createIndex('by-entity-type', 'entityType');
      }
    };
  });
}

/**
 * Get queued operations from IndexedDB
 */
function getQueuedOperations(db, entityType) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const index = store.index('by-entity-type');
    const request = index.getAll(entityType);

    request.onsuccess = () => {
      const operations = request.result.filter(
        (op) => op.status === 'pending' && op.retryCount < 3
      );
      resolve(operations);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Sync a single operation
 */
async function syncOperation(operation) {
  // Get Supabase URL and key from environment
  // Note: In a real implementation, you'd need to pass these securely
  const SUPABASE_URL = self.registration.scope.replace('/sw.js', '');
  
  // Make API call to sync operation
  const response = await fetch(`${SUPABASE_URL}/api/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(operation),
  });

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Remove operation from queue
 */
function removeOperation(db, operationId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const request = store.delete(operationId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Increment retry count
 */
function incrementRetry(db, operationId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const request = store.get(operationId);

    request.onsuccess = () => {
      const operation = request.result;
      if (operation) {
        operation.retryCount += 1;
        if (operation.retryCount >= 3) {
          operation.status = 'failed';
        }
        const updateRequest = store.put(operation);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    const entityType = event.data.entityType || 'all';
    const syncTag = `${SYNC_TAG_PREFIX}-${entityType}`;
    
    // Register background sync
    if ('sync' in self.registration) {
      self.registration.sync.register(syncTag).catch((error) => {
        console.error('[SW] Failed to register sync:', error);
      });
    }
  }
});

console.log('[SW] Service Worker loaded');
