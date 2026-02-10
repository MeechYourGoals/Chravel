/**
 * PWA Cache Utilities
 *
 * Used when user explicitly requests a refresh (pull-to-refresh, refresh button)
 * to bypass stale Service Worker cache and fetch fresh data.
 *
 * Addresses: Pro trips/events not showing in PWA due to cached Supabase responses.
 */

const SUPABASE_CACHE_NAMES = ['chravel-supabase-api'];

/**
 * Clears Service Worker caches that may hold stale Supabase API responses.
 * Call this when user explicitly triggers a refresh (pull-to-refresh, manual refresh).
 *
 * This helps resolve PWA data sync issues where trips/events appear in browser
 * but not in the installed PWA due to cached responses.
 */
export async function clearDataCaches(): Promise<void> {
  if (!('caches' in window)) return;

  try {
    const names = await caches.keys();
    const toDelete = names.filter(name =>
      SUPABASE_CACHE_NAMES.some(pattern => name.includes(pattern)),
    );
    await Promise.all(toDelete.map(name => caches.delete(name)));
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[pwaCacheUtils] Failed to clear data caches:', err);
    }
  }
}
