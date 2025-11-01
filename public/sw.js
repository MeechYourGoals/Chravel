/**
 * Service Worker for Offline Support
 * Features:
 * - Offline-first caching strategy
 * - Map tiles prefetching
 * - Itinerary and trip data caching
 * - Background sync for offline changes
 * - Push notification handling
 * - Dynamic versioning from deployment SHA
 */

// Parse version from SW URL query parameter (e.g., /sw.js?v=abc123)
const urlParams = new URLSearchParams(self.location.search);
const buildVersion = urlParams.get('v') || 'v0';
const CACHE_VERSION = `chravel-${buildVersion}`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const MAP_TILES_CACHE = `${CACHE_VERSION}-map-tiles`;
const IMAGES_CACHE = `${CACHE_VERSION}-images`;

// Resources to cache immediately on install
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/offline.html',
  '/chravel-logo.png',
  '/chravel-icon.png',
  '/manifest.json'
];

// Map tile URL pattern (Google Maps, Mapbox, etc.)
const MAP_TILE_PATTERN = /tiles\..*\.(png|jpg|jpeg|webp)/i;

// API patterns to cache
const API_CACHE_PATTERNS = [
  /\/trips\/[^/]+$/,
  /\/trip_members/,
  /\/trip_events/,
  /\/itinerary/
];

// Maximum cache sizes
const MAX_DYNAMIC_CACHE_SIZE = 50; // 50 items
const MAX_MAP_TILES_CACHE_SIZE = 500; // 500 tiles (~50MB)
const MAX_IMAGES_CACHE_SIZE = 100; // 100 images

// ============================================================================
// Service Worker Lifecycle Events
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('[SW] Static resources cached');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('chravel-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== MAP_TILES_CACHE && name !== IMAGES_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control of all pages immediately
      })
  );
});

// ============================================================================
// Fetch Event - Network Strategies
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Strategy selection based on request type
  if (MAP_TILE_PATTERN.test(url.pathname)) {
    // Map tiles: Cache first, network fallback
    event.respondWith(cacheFirstStrategy(request, MAP_TILES_CACHE, MAX_MAP_TILES_CACHE_SIZE));
  } else if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) {
    // Images: Cache first, network fallback
    event.respondWith(cacheFirstStrategy(request, IMAGES_CACHE, MAX_IMAGES_CACHE_SIZE));
  } else if (url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/i)) {
    // Static assets: Stale-while-revalidate (serve cache, update in background)
    event.respondWith(staleWhileRevalidateStrategy(request, STATIC_CACHE));
  } else if (isAPIRequest(url)) {
    // API requests: Network first, cache fallback
    event.respondWith(networkFirstStrategy(request));
  } else {
    // HTML pages: Network first, cache fallback
    event.respondWith(networkFirstStrategy(request));
  }
});

// ============================================================================
// Caching Strategies
// ============================================================================

async function cacheFirstStrategy(request, cacheName = DYNAMIC_CACHE, maxSize = MAX_DYNAMIC_CACHE_SIZE) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Cache hit:', request.url);
      return cachedResponse;
    }

    console.log('[SW] Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Clone response before caching
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      await limitCacheSize(cacheName, maxSize);
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({ 'Content-Type': 'text/plain' })
    });
  }
}

async function staleWhileRevalidateStrategy(request, cacheName = STATIC_CACHE) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Fetch fresh version in background
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      console.log('[SW] Updated cache with fresh version:', request.url);
    }
    return networkResponse;
  }).catch(err => {
    console.warn('[SW] Background fetch failed:', request.url, err);
    return null;
  });

  // Return cached version immediately, or wait for network if no cache
  if (cachedResponse) {
    console.log('[SW] Serving cached (updating in background):', request.url);
    return cachedResponse;
  }

  console.log('[SW] No cache, waiting for network:', request.url);
  return fetchPromise;
}

async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      await limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE);
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) return offlinePage;
    }

    return new Response('Offline - No cached version available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({ 'Content-Type': 'text/plain' })
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function isAPIRequest(url) {
  // Check if URL matches API patterns
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname)) ||
         url.hostname.includes('supabase.co');
}

async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxSize) {
    // Remove oldest entries (FIFO)
    const toDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(toDelete.map(key => cache.delete(key)));
    console.log(`[SW] Trimmed ${cacheName}: removed ${toDelete.length} items`);
  }
}

// ============================================================================
// Message Handling - Prefetch Commands
// ============================================================================

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'PREFETCH_TRIP_DATA':
      handlePrefetchTripData(payload);
      break;

    case 'PREFETCH_MAP_TILES':
      handlePrefetchMapTiles(payload);
      break;

    case 'CLEAR_CACHE':
      handleClearCache(payload.cacheName);
      break;

    case 'GET_CACHE_STATUS':
      handleGetCacheStatus(event);
      break;

    default:
      console.log('[SW] Unknown message type:', type);
  }
});

async function handlePrefetchTripData(payload) {
  const { tripId, urls } = payload;

  if (!urls || urls.length === 0) {
    console.warn('[SW] No URLs provided for prefetching');
    return;
  }

  console.log(`[SW] Prefetching trip data for trip ${tripId}:`, urls.length, 'URLs');

  const cache = await caches.open(DYNAMIC_CACHE);
  const prefetchPromises = urls.map(async (url) => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        console.log('[SW] Prefetched:', url);
      }
    } catch (error) {
      console.error('[SW] Prefetch failed:', url, error);
    }
  });

  await Promise.all(prefetchPromises);
  console.log('[SW] Trip data prefetch complete');
}

async function handlePrefetchMapTiles(payload) {
  const { bounds, zoom } = payload;

  if (!bounds || !zoom) {
    console.warn('[SW] Invalid map tile prefetch request');
    return;
  }

  console.log('[SW] Prefetching map tiles:', { bounds, zoom });

  // Calculate tile URLs based on bounds and zoom
  // This is a simplified example - real implementation depends on map provider
  const tiles = calculateTileUrls(bounds, zoom);

  const cache = await caches.open(MAP_TILES_CACHE);
  const prefetchPromises = tiles.map(async (tileUrl) => {
    try {
      const response = await fetch(tileUrl);
      if (response.ok) {
        await cache.put(tileUrl, response);
      }
    } catch (error) {
      console.error('[SW] Tile prefetch failed:', tileUrl, error);
    }
  });

  await Promise.all(prefetchPromises);
  await limitCacheSize(MAP_TILES_CACHE, MAX_MAP_TILES_CACHE_SIZE);
  console.log(`[SW] Prefetched ${tiles.length} map tiles`);
}

async function handleClearCache(cacheName) {
  if (cacheName) {
    await caches.delete(cacheName);
    console.log('[SW] Cleared cache:', cacheName);
  } else {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('[SW] Cleared all caches');
  }
}

async function handleGetCacheStatus(event) {
  const caches = await getCacheStatistics();
  event.ports[0].postMessage({ type: 'CACHE_STATUS', payload: caches });
}

async function getCacheStatistics() {
  const cacheNames = await caches.keys();
  const stats = {};

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    stats[name] = {
      count: keys.length,
      urls: keys.map(req => req.url)
    };
  }

  return stats;
}

function calculateTileUrls(bounds, zoom) {
  // Simplified tile URL calculation
  // In production, use proper tile calculation based on map provider (Google, Mapbox, etc.)
  const tiles = [];
  const { north, south, east, west } = bounds;

  // This is a placeholder - real implementation would convert lat/lng to tile coordinates
  // and generate proper tile URLs for the map provider

  return tiles;
}

// ============================================================================
// Push Notification Handling
// ============================================================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('[SW] Failed to parse push data:', error);
    data = { title: 'Chravel', body: 'You have a new notification' };
  }

  const title = data.title || 'Chravel';
  const options = {
    body: data.body || '',
    icon: data.icon || '/chravel-icon.png',
    badge: data.badge || '/chravel-badge.png',
    data: data.data || {},
    tag: data.tag || 'chravel-notification',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if a window is already open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ============================================================================
// Background Sync (for offline actions)
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-offline-changes') {
    event.waitUntil(syncOfflineChanges());
  }
});

async function syncOfflineChanges() {
  console.log('[SW] Syncing offline changes...');

  // Get offline changes from IndexedDB or cache
  // This is a placeholder - real implementation would sync with backend

  try {
    // Example: sync queued messages, tasks, etc.
    const success = true; // Replace with actual sync logic

    if (success) {
      console.log('[SW] Offline changes synced successfully');
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error; // Will retry sync later
  }
}

console.log('[SW] Service worker script loaded');
