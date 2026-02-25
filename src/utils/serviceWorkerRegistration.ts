import { isLovablePreview } from '@/utils/env';

export const registerServiceWorker = async () => {
  // Don't register SW in Lovable preview environment
  // CRITICAL: Preview includes lovable.app, *.lovable.app, lovableproject.com, *.lovableproject.com
  if (isLovablePreview()) {
    // One-time cleanup of any existing SW in preview (v2 to re-run after domain fix)
    const CLEANUP_KEY = 'lovable_sw_cleanup_v2';
    if (!localStorage.getItem(CLEANUP_KEY)) {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      localStorage.setItem(CLEANUP_KEY, 'true');
    }
    return;
  }

  // Production SW registration
  if ('serviceWorker' in navigator) {
    try {
      // Derive buildId from env (Render's git commit or VITE_BUILD_ID)
      const buildId =
        import.meta.env.VITE_BUILD_ID ||
        import.meta.env.RENDER_GIT_COMMIT ||
        import.meta.env.RENDER_GIT_COMMIT_SHA ||
        'static';
      const swUrl = `/sw.js?v=${buildId}`;

      // One-time production cleanup migration (v1)
      const PROD_MIGRATION_KEY = 'prod_sw_migration_v1';
      if (!localStorage.getItem(PROD_MIGRATION_KEY)) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));

        if ('caches' in window) {
          const keys = await caches.keys();
          const chravelCaches = keys.filter(k => k.startsWith('chravel-'));
          await Promise.all(chravelCaches.map(k => caches.delete(k)));
        }

        localStorage.setItem(PROD_MIGRATION_KEY, 'true');
      }

      const registration = await navigator.serviceWorker.register(swUrl, {
        updateViaCache: 'none',
      });

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            // Service worker state changed
          });
        }
      });

      // Log only - don't auto-reload to prevent loops
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New service worker activated
      });

      // Check for updates every 5 minutes
      setInterval(() => {
        registration.update().catch(err => {
          if (import.meta.env.DEV) {
            console.warn('[SW] Update check failed:', err);
          }
        });
      }, 300000);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[SW] Service Worker registration failed:', error);
      }

      // On failure, trigger cleanup to recover from stale SW
      const PROD_MIGRATION_KEY = 'prod_sw_migration_v1';
      if (localStorage.getItem(PROD_MIGRATION_KEY)) {
        localStorage.removeItem(PROD_MIGRATION_KEY);

        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }

        if ('caches' in window) {
          const keys = await caches.keys();
          const chravelCaches = keys.filter(k => k.startsWith('chravel-'));
          await Promise.all(chravelCaches.map(k => caches.delete(k)));
        }
      }
    }
  }
};

export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
};
