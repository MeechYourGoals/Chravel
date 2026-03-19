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

  // App shell (precache) + offline fallback for navigation.
  const appShellHandler = workbox.precaching.createHandlerBoundToURL('/index.html');

  workbox.routing.registerRoute(
    new workbox.routing.NavigationRoute(async ({ event }) => {
      try {
        return await appShellHandler({ event });
      } catch {
        return caches.match('/offline.html', { ignoreSearch: true });
      }
    }),
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

// ============================================================================
// Push Notification Handlers (outside Workbox block — always active)
// ============================================================================

/**
 * Handle incoming push events from the server.
 * Parses the payload and shows a notification via the Notification API.
 */
self.addEventListener('push', function (event) {
  if (!event.data) return;

  var payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      title: 'ChravelApp',
      body: event.data.text() || 'You have a new notification',
    };
  }

  var title = payload.title || 'ChravelApp';
  var options = {
    body: payload.body || '',
    icon: payload.icon || '/chravel-logo.png',
    badge: payload.badge || '/chravel-badge.png',
    image: payload.image || undefined,
    data: payload.data || {},
    actions: payload.actions || [],
    tag: payload.tag || 'chravel-push-' + Date.now(),
    requireInteraction: payload.requireInteraction || false,
    renotify: true,
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Handle notification click — navigate to the relevant trip/page.
 * Security: This only constructs client-side URLs. Auth and RLS are enforced
 * by the app's normal auth hydration and Supabase RLS on data fetch.
 * Notification payloads originate from our server-controlled edge functions.
 */
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var data = event.notification.data || {};
  var action = event.action;
  var targetUrl = '/';

  // Build target URL from notification data
  if (data.tripId) {
    var type = data.type || '';
    switch (type) {
      case 'chat_message':
        targetUrl = '/trip/' + data.tripId + '?tab=chat';
        break;
      case 'broadcast':
        targetUrl = '/trip/' + data.tripId + '?tab=chat&view=broadcasts';
        break;
      case 'calendar_event':
      case 'itinerary_update':
        targetUrl = '/trip/' + data.tripId + '?tab=calendar';
        break;
      case 'payment_request':
      case 'payment_split':
        targetUrl = '/trip/' + data.tripId + '?tab=payments';
        if (data.paymentId) targetUrl += '&payment=' + data.paymentId;
        break;
      case 'task_assigned':
        targetUrl = '/trip/' + data.tripId + '?tab=tasks';
        break;
      case 'poll_vote':
        targetUrl = '/trip/' + data.tripId + '?tab=polls';
        break;
      case 'trip_invite':
      case 'trip_reminder':
      default:
        targetUrl = '/trip/' + data.tripId;
        break;
    }
  } else if (data.url) {
    targetUrl = data.url;
  }

  // Handle specific button actions
  if (action === 'dismiss') return;
  if (action === 'pay' && data.tripId && data.paymentId) {
    targetUrl = '/trip/' + data.tripId + '?tab=payments&payment=' + data.paymentId + '&action=pay';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Focus existing window if available
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});
