export const registerServiceWorker = async () => {
  // Don't register SW in Lovable preview environment
  const isLovablePreview = 
    typeof window !== 'undefined' && 
    window.location.hostname.endsWith('lovableproject.com');
  
  if (isLovablePreview) {
    console.log('[SW] Skipping registration in Lovable preview');
    
    // One-time cleanup of any existing SW in preview
    const CLEANUP_KEY = 'lovable_sw_cleanup_v1';
    if (!localStorage.getItem(CLEANUP_KEY)) {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
        console.log('[SW] Unregistered stale service workers');
      }
      
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        console.log('[SW] Cleared all caches');
      }
      
      localStorage.setItem(CLEANUP_KEY, 'true');
    }
    return;
  }
  
  // Production SW registration
  if ('serviceWorker' in navigator) {
    try {
      const buildId = import.meta.env.VITE_BUILD_ID || Date.now().toString();
      const swUrl = `/sw.js?v=${buildId}`;
      
      console.log(`[SW] Registering service worker with version: ${buildId}`);
      const registration = await navigator.serviceWorker.register(swUrl, {
        updateViaCache: 'none'
      });
      
      console.log('[SW] Service Worker registered:', registration);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[SW] Update found, installing new service worker...');
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            console.log('[SW] New worker state:', newWorker.state);
            
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New service worker installed, will activate on next navigation');
            }
          });
        }
      });
      
      // Log only - don't auto-reload to prevent loops
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] New service worker activated - refresh to see updates');
      });
      
      // Check for updates every 5 minutes
      setInterval(() => {
        registration.update().catch(err => 
          console.warn('[SW] Update check failed:', err)
        );
      }, 300000);
      
    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error);
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
