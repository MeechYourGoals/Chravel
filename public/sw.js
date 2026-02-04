/**
 * Service Worker for Chravel
 * 
 * Handles:
 * - Background synchronization of offline operations
 * - Web Push notifications with action buttons
 * - Notification click handling and routing
 * 
 * @see https://web.dev/push-notifications-handling-messages/
 */

const CACHE_NAME = 'chravel-offline-sync-v1';
const SYNC_TAG_PREFIX = 'chravel-sync';

// Default icons
const DEFAULT_ICON = '/chravel-logo.png';
const DEFAULT_BADGE = '/chravel-badge.png';

// ============================================================================
// Service Worker Lifecycle Events
// ============================================================================

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

// ============================================================================
// Web Push Notification Events
// ============================================================================

/**
 * Handle incoming push messages
 * Shows notification with optional action buttons
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');
  
  if (!event.data) {
    console.warn('[SW] Push event has no data');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    console.error('[SW] Failed to parse push data:', e);
    payload = {
      title: 'Chravel',
      body: event.data.text(),
    };
  }

  console.log('[SW] Push payload:', payload);

  // Build notification options
  const options = {
    body: payload.body || '',
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_BADGE,
    image: payload.image,
    tag: payload.tag || `chravel-notification-${Date.now()}`,
    data: payload.data || {},
    actions: payload.actions || [],
    requireInteraction: payload.requireInteraction || false,
    renotify: payload.renotify !== false,
    silent: payload.silent || false,
    timestamp: payload.timestamp || Date.now(),
    vibrate: payload.vibrate || [200, 100, 200],
  };

  // Add default actions based on notification type if none provided
  if (options.actions.length === 0 && options.data.type) {
    options.actions = getDefaultActionsForType(options.data.type, options.data);
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Chravel', options)
  );
});

/**
 * Get default action buttons based on notification type
 */
function getDefaultActionsForType(type, data) {
  switch (type) {
    case 'chat_message':
    case 'mention':
      return [
        { action: 'reply', title: 'Reply', icon: '/icons/reply.png' },
        { action: 'view', title: 'View Trip', icon: '/icons/view.png' },
      ];
    
    case 'itinerary_update':
      return [
        { action: 'view', title: 'View Changes', icon: '/icons/calendar.png' },
      ];
    
    case 'payment_request':
    case 'payment_split':
      return [
        { action: 'pay', title: 'Pay Now', icon: '/icons/payment.png' },
        { action: 'view', title: 'View Details', icon: '/icons/view.png' },
      ];
    
    case 'trip_reminder':
      return [
        { action: 'view', title: 'View Trip', icon: '/icons/trip.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/close.png' },
      ];
    
    case 'trip_invite':
      return [
        { action: 'accept', title: 'Accept', icon: '/icons/check.png' },
        { action: 'view', title: 'View Trip', icon: '/icons/view.png' },
      ];
    
    case 'poll_vote':
      return [
        { action: 'vote', title: 'Vote Now', icon: '/icons/poll.png' },
        { action: 'view', title: 'View Poll', icon: '/icons/view.png' },
      ];
    
    case 'task_assigned':
      return [
        { action: 'complete', title: 'Mark Complete', icon: '/icons/check.png' },
        { action: 'view', title: 'View Task', icon: '/icons/task.png' },
      ];
    
    case 'broadcast':
      return [
        { action: 'view', title: 'View', icon: '/icons/broadcast.png' },
      ];
    
    default:
      return [
        { action: 'view', title: 'View', icon: '/icons/view.png' },
      ];
  }
}

/**
 * Handle notification click events
 * Routes user to appropriate page based on notification data
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action, event.notification.data);
  
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  // Build URL based on action and notification data
  let url = '/';
  
  if (data.url) {
    // Use explicit URL if provided
    url = data.url;
  } else if (data.tripId) {
    // Build URL based on notification type and action
    const baseUrl = `/trips/${data.tripId}`;
    
    switch (action) {
      case 'reply':
        url = `${baseUrl}/chat${data.messageId ? `?reply=${data.messageId}` : ''}`;
        break;
      
      case 'pay':
        url = `${baseUrl}/budget${data.paymentId ? `?payment=${data.paymentId}` : ''}`;
        break;
      
      case 'vote':
        url = `${baseUrl}/polls${data.pollId ? `?poll=${data.pollId}` : ''}`;
        break;
      
      case 'complete':
      case 'view':
        switch (data.type) {
          case 'chat_message':
          case 'mention':
            url = `${baseUrl}/chat${data.messageId ? `?message=${data.messageId}` : ''}`;
            break;
          
          case 'itinerary_update':
            url = `${baseUrl}/itinerary${data.eventId ? `?event=${data.eventId}` : ''}`;
            break;
          
          case 'payment_request':
          case 'payment_split':
            url = `${baseUrl}/budget${data.paymentId ? `?payment=${data.paymentId}` : ''}`;
            break;
          
          case 'poll_vote':
            url = `${baseUrl}/polls${data.pollId ? `?poll=${data.pollId}` : ''}`;
            break;
          
          case 'task_assigned':
            url = `${baseUrl}/tasks${data.taskId ? `?task=${data.taskId}` : ''}`;
            break;
          
          case 'broadcast':
            url = `${baseUrl}/broadcasts`;
            break;
          
          default:
            url = baseUrl;
        }
        break;
      
      case 'accept':
        url = `/invites${data.inviteId ? `/${data.inviteId}` : ''}`;
        break;
      
      case 'dismiss':
        // Just close the notification, don't navigate
        return;
      
      default:
        // Default to trip page
        url = baseUrl;
    }
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Find existing Chravel window
        const existingClient = windowClients.find((client) => {
          return client.url.includes(self.registration.scope);
        });

        if (existingClient) {
          // Navigate existing window and focus
          existingClient.navigate(url);
          return existingClient.focus();
        }

        // Open new window
        return clients.openWindow(url);
      })
      .catch((error) => {
        console.error('[SW] Error handling notification click:', error);
      })
  );
});

/**
 * Handle notification close events (for analytics)
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
  
  // Could send analytics event here
  // Example: track notification dismissals for engagement metrics
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
async function processSyncQueue(syncTag) {
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
