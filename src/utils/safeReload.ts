/**
 * Safe page reload utility that works in both web and Capacitor (native) contexts.
 *
 * In a Capacitor WebView, `window.location.reload()` can destroy native event
 * listeners, push-notification routing, and lifecycle bridges. This utility
 * avoids hard reloads on native platforms wherever possible.
 *
 * Behavior:
 *  - **Web / PWA**: calls `window.location.reload()` (standard behavior).
 *  - **Capacitor (native)**: navigates to the current route with a cache-bust
 *    query param, which triggers a fresh mount of the React tree without
 *    tearing down the native WebView context. The current pathname, existing
 *    query parameters, and hash are all preserved so users stay on the same
 *    page (e.g., /trip/:id, /settings, modal deep links).
 */
import { Capacitor } from '@capacitor/core';

/**
 * Perform a safe reload.
 *
 * @param clearCaches - If true, clears SW caches before reloading (default false).
 */
export async function safeReload(clearCaches = false): Promise<void> {
  if (clearCaches) {
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      }
    } catch {
      // Ignore cache clearing failures
    }
  }

  if (Capacitor.isNativePlatform()) {
    // On native, avoid hard reload. Instead, navigate to the current route
    // with a cache-bust param. This forces React Router to remount the app
    // tree cleanly while preserving the user's current path, query params,
    // and hash fragment.
    const url = new URL(window.location.href);
    url.searchParams.set('_reload', String(Date.now()));
    window.location.replace(url.pathname + url.search + url.hash);
  } else {
    window.location.reload();
  }
}
