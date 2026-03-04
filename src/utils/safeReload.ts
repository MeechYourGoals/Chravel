/**
 * Safe page reload utility that works in web, PWA standalone, and Capacitor native contexts.
 */
import { Capacitor } from '@capacitor/core';

const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

const buildCacheBustedPath = (): string => {
  let url: URL;
  try {
    url = new URL(window.location.href);
  } catch {
    url = new URL('/', window.location.origin || 'http://localhost');
  }

  url.searchParams.set('_reload', String(Date.now()));
  return `${url.pathname}${url.search}${url.hash}`;
};

const clearServiceWorkerState = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
  }
};

/**
 * Perform a safe reload.
 *
 * @param clearCaches - If true, clears SW caches + registrations before reloading.
 */
export async function safeReload(clearCaches = false): Promise<void> {
  if (clearCaches) {
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      }

      await clearServiceWorkerState();
    } catch {
      // Ignore cache clearing failures
    }
  }

  const cacheBustedPath = buildCacheBustedPath();

  if (Capacitor.isNativePlatform()) {
    window.location.replace(cacheBustedPath);
    return;
  }

  if (clearCaches || isStandalonePWA()) {
    window.location.replace(cacheBustedPath);
    return;
  }

  window.location.reload();
}
