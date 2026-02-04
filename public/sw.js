/* eslint-disable no-undef */

importScripts('/workbox-sw.js');

if (self.workbox) {
  workbox.setConfig({ debug: false });

  workbox.core.skipWaiting();
  workbox.core.clientsClaim();
  workbox.precaching.cleanupOutdatedCaches();
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  const SEVEN_DAYS = 7 * 24 * 60 * 60;
  const ONE_DAY = 24 * 60 * 60;

  const cacheableOk = new workbox.cacheableResponse.CacheableResponsePlugin({
    statuses: [0, 200],
  });

  // App shell (cache-first) + offline fallback for navigation.
  const appShellHandler = new workbox.strategies.CacheFirst({
    cacheName: 'chravel-app-shell',
    plugins: [
      cacheableOk,
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: SEVEN_DAYS,
      }),
    ],
  });

  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    async ({ event }) => {
      try {
        return await appShellHandler.handle({ event, request: event.request });
      } catch {
        return caches.match('/offline.html', { ignoreSearch: true });
      }
    },
  );

  // Cache-first static assets (JS/CSS/fonts/images).
  workbox.routing.registerRoute(
    ({ request }) => ['style', 'script', 'font', 'image'].includes(request.destination),
    new workbox.strategies.CacheFirst({
      cacheName: 'chravel-static-assets',
      plugins: [
        cacheableOk,
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 300,
          maxAgeSeconds: SEVEN_DAYS,
        }),
      ],
    }),
  );

  // Google Maps tiles & static imagery.
  workbox.routing.registerRoute(
    ({ url, request }) =>
      request.destination === 'image' &&
      (url.hostname.includes('maps.googleapis.com') ||
        url.hostname.includes('maps.gstatic.com') ||
        /mt\d+\.google\./.test(url.hostname)),
    new workbox.strategies.CacheFirst({
      cacheName: 'chravel-maps-tiles',
      plugins: [
        cacheableOk,
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: SEVEN_DAYS,
        }),
      ],
    }),
  );

  // Supabase API (GET) - network-first.
  workbox.routing.registerRoute(
    ({ url, request }) => request.method === 'GET' && url.hostname.endsWith('.supabase.co'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'chravel-supabase-api',
      networkTimeoutSeconds: 8,
      plugins: [
        cacheableOk,
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: ONE_DAY,
        }),
      ],
    }),
  );

  // Trip media & avatars - stale-while-revalidate.
  workbox.routing.registerRoute(
    ({ url, request }) =>
      request.destination === 'image' &&
      (url.pathname.includes('/storage/v1/object/') || url.pathname.includes('/avatars/')),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'chravel-media',
      plugins: [
        cacheableOk,
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: ONE_DAY,
        }),
      ],
    }),
  );

  // Non-critical same-origin API responses (GET).
  workbox.routing.registerRoute(
    ({ url, request }) =>
      request.method === 'GET' &&
      url.origin === self.location.origin &&
      url.pathname.startsWith('/api/'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'chravel-api-noncritical',
      plugins: [
        cacheableOk,
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: ONE_DAY,
        }),
      ],
    }),
  );

  // Background sync for mutating requests.
  const apiQueue = new workbox.backgroundSync.BackgroundSyncPlugin('chravel-api-queue', {
    maxRetentionTime: 24 * 60, // minutes
  });

  workbox.routing.registerRoute(
    ({ url, request }) => request.method !== 'GET' && url.hostname.endsWith('.supabase.co'),
    new workbox.strategies.NetworkOnly({
      plugins: [apiQueue],
    }),
  );

  workbox.routing.registerRoute(
    ({ url, request }) =>
      request.method !== 'GET' &&
      url.origin === self.location.origin &&
      url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkOnly({
      plugins: [apiQueue],
    }),
  );

  // Offline fallback for document requests.
  workbox.routing.setCatchHandler(async ({ event }) => {
    if (event.request.destination === 'document') {
      return caches.match('/offline.html', { ignoreSearch: true });
    }
    return Response.error();
  });

  self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });
}
