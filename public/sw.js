/**
 * Minimal Service Worker for Chravel
 * 
 * CRITICAL: This SW does NOT cache anything aggressively.
 * Strategy: Let the browser and server handle all caching via HTTP headers.
 * 
 * Why minimal?
 * - Prevents stale index.html/chunks from being served after deployments
 * - Eliminates service worker update loops caused by dynamic versioning
 * - Removes complexity of managing cache invalidation
 * 
 * What it does:
 * - Immediately activates (skipWaiting)
 * - Takes control of all pages (claim)
 * - No fetch interception = no stale cache issues
 */

const VERSION = 'minimal-v1';

self.addEventListener('install', (event) => {
  console.log('[SW] Installing minimal service worker:', VERSION);
  // Immediately activate - don't wait for old SW to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating minimal service worker:', VERSION);
  
  event.waitUntil(
    // Clean up any old caches from previous SW versions
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('chravel-'))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// NO FETCH HANDLER
// This is intentional - we let the browser handle all requests normally.
// HTTP caching headers (set by Render/hosting) will handle caching.
// This prevents stale assets from being served after deployments.

console.log('[SW] Minimal service worker loaded:', VERSION);
